# boleta_api/extraccion.py
import re
import requests
import unicodedata
import pytesseract
from typing import Optional, Dict, List, Union, Tuple
from datetime import datetime, date, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from pdf2image import convert_from_bytes
from pdf2image.exceptions import PDFInfoNotInstalledError, PDFPageCountError
from PIL import Image, UnidentifiedImageError
import pdfplumber
from decimal import Decimal, InvalidOperation
import logging

# =======================#
# CAMPOS CLAVE ESPERADOS #
# =======================#
CAMPOS_CLAVE = ["ruc", "razon_social", "fecha", "numero_documento", "total", "tipo_documento", "concepto"]

# =====================#
# NORMALIZAR TEXTO OCR #
# =====================#
def normalizar_texto_ocr(texto: str) -> str:
    """
    Normaliza texto OCR para mejorar la extracción:
    - Quita acentos y convierte a mayúsculas.
    - Corrige errores típicos de OCR (SAC, SA, etc.).
    - Elimina símbolos no útiles pero conserva: . , - / &
    - Limpia espacios alrededor de guiones y slashes.
    - Borra numeritos o basura al inicio de las líneas.
    - Compacta espacios múltiples.
    """
    if not texto:
        return ""

    # --- Paso 1: quitar acentos ---
    texto = unicodedata.normalize('NFKD', texto)
    texto = texto.encode('ascii', 'ignore').decode('utf-8')

    # --- Paso 2: mayúsculas ---
    texto = texto.upper()

    # --- Paso 3: reemplazos típicos de OCR ---
    reemplazos = {
        "5A": "S.A",
        "$.A.C": "S.A.C",
        "S , A": "S.A",
        "S . A . C": "S.A.C",
        "S . A": "S.A",
        "3.A.C": "S.A.C",
        "SAC.": "S.A.C",
        "SA.": "S.A.",
        "E/": "11/",
        "RETALE": "RETAIL"
    }
    for k, v in reemplazos.items():
        texto = texto.replace(k, v)

    # --- Paso 4: eliminar símbolos no útiles ---
    # Permitimos letras, números y los símbolos útiles . , - / &
    texto = re.sub(r"[^A-Z0-9\.\,\-\/&\s]", " ", texto)

    # --- Paso 5: limpiar espacios alrededor de guiones y slashes ---
    texto = re.sub(r"\s*-\s*", "-", texto)
    texto = re.sub(r"\s*/\s*", "/", texto)

    # --- Paso 6: limpiar numeritos iniciales de línea (ej: '1 TAI LOY' -> 'TAI LOY') ---
    lineas = []
    for linea in texto.splitlines():
        linea = linea.strip()
        linea = re.sub(r"^\d+\s+", "", linea)  # quita números al inicio
        if linea:
            lineas.append(linea)

    # --- Paso 7: compactar espacios múltiples ---
    texto_limpio = "\n".join(re.sub(r"\s{2,}", " ", l) for l in lineas)

    return texto_limpio.strip()

def normalizar_monto(monto_txt: str) -> Optional[str]:
    """
    Normaliza un monto textual a formato '0.00':
    - Maneja: '1,234.56', '1.234,56', '1234,56', '1234.56'
    - Elimina símbolos extraños.
    - Siempre retorna 2 decimales.
    Retorna None si no se puede parsear.
    """
    if not monto_txt:
        return None

    s = re.sub(r"[^\d,.\-]", "", monto_txt)
    if not s:
        return None

    # Decide cuál es decimal
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")  # 1.234,56 → 1234.56
        else:
            s = s.replace(",", "")                    # 1,234.56 → 1234.56
    elif "," in s:
        if s.count(",") == 1:
            s = s.replace(",", ".")                   # 1234,56 → 1234.56
        else:
            partes = s.split(",")
            s = "".join(partes[:-1]) + "." + partes[-1]

    try:
        d = Decimal(s)
        # Siempre 2 decimales
        return f"{d.quantize(Decimal('0.00'))}"
    except (InvalidOperation, ValueError):
        return None

# ========================#
# DETECTORES INDIVIDUALES #
# ========================#
def detectar_numero_documento(texto: str, debug: bool = False) -> str:
    """
    Detecta el número de documento (boleta/factura/nota/ticket) en OCR de PDFs o imágenes.

    Características:
    - Maneja variantes de separador: Nº, N°, No, Nro.
    - Permite series alfanuméricas (ej: F581, E001, B020, BE01, FE01).
    - Detecta correlativos largos (hasta 14 dígitos).
    - Prioriza prefijos válidos de comprobantes SUNAT.
    - Devuelve el candidato más confiable.
    """
    import re
    from .extraccion import detectar_ruc

    if not texto:
        return "ND"

    texto_norm = texto.upper()
    # Correcciones OCR típicas
    texto_norm = (
        texto_norm.replace("O", "0")
                  .replace("I", "1")
                  .replace("L", "1")
    )

    lineas = [l.strip() for l in texto_norm.splitlines() if l.strip()]

    # Detectar RUC/DNI para excluirlos
    ruc_valor = detectar_ruc(texto) or ""
    dni_matches = re.findall(r"\b\d{8}\b", texto_norm)
    ignorar = [ruc_valor] + dni_matches

    # Prefijos válidos de comprobantes SUNAT
    prefijos_validos = (
        "F", "B", "E", "NC", "ND",
        "FE", "BE", "BV", "FA", "TK"  # extensiones comunes
    )

    # Patrón robusto: serie (2-4 caracteres alfanuméricos) + opcional Nº + correlativo
    patron = re.compile(
        r"\b([A-Z]{1,3}\d{0,4})\s*(?:N[°ºO.]?\s*)?[-]?\s*(\d{2,14})\b"
    )

    candidatos = []
    for idx, linea in enumerate(lineas):
        for match in patron.finditer(linea):
            serie, correlativo = match.groups()
            numero = f"{serie}-{correlativo}"

            # Excluir si coincide con RUC/DNI
            if any(numero.replace("-", "") == x for x in ignorar):
                continue

            # Calcular prioridad
            prioridad = 0
            # Prefijos SUNAT → más peso
            if serie.startswith(prefijos_validos):
                prioridad += 3
            # Serie con letras + dígitos (ej: F581, BE01) → más confiable
            if re.match(r"[A-Z]+\d+", serie):
                prioridad += 1
            # Longitud del correlativo (más largo = más confiable)
            prioridad += len(correlativo) // 4

            candidatos.append((numero, prioridad, idx))

    if debug:
        print("Candidatos detectados:", candidatos)

    if candidatos:
        # Ordenar por prioridad, luego por longitud, luego por posición
        candidatos.sort(key=lambda x: (-x[1], -len(x[0]), x[2]))
        return candidatos[0][0]

    return "ND"

def detectar_fecha(texto: str, debug: bool = False) -> Optional[str]:
    """
    Detecta la fecha de emisión en boletas/facturas y normaliza a YYYY-MM-DD.

    - Soporta formatos numéricos (dd/mm/yyyy, yyyy/mm/dd, dd-mm-yyyy, dd.mm.yyyy)
    - Soporta meses escritos (ene, septiembre, sept, etc.) en mayúscula/minúscula
    - Si hay varias fechas, prioriza la más cercana a la línea "FECHA EMISIÓN"
    - Ignora líneas con "VENCIMIENTO"
    """
    import re
    from datetime import datetime, timedelta

    if not texto:
        return None

    # --- Normalizar texto: unificar separadores y espacios ---
    txt = texto.replace('\r', '\n')
    # reemplazar guiones entre números/dates y también guiones simples
    txt = re.sub(r'[-–—]', '/', txt)
    # reemplazar puntos usados como separador de fecha (ej: 17.sep.2025) por '/'
    txt = re.sub(r'\.(?=\d)', '/', txt)
    # colapsar espacios múltiples
    txt = re.sub(r'\s+', ' ', txt)

    lineas = [l.strip() for l in txt.splitlines() if l.strip()]

    # buscar línea de referencia "FECHA EMISIÓN"
    fecha_ref_idx = None
    for i, l in enumerate(lineas):
        if re.search(r'FECHA\s*(DE\s*)?EMIS', l, flags=re.IGNORECASE):
            fecha_ref_idx = i
            break

    # mapa de meses por sus 3 primeras letras (robusto ante variantes)
    meses_3 = {
        "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12
    }

    # patrones (usamos finditer para recuperar match.group(0))
    pat_num = re.compile(r'\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b')        # dd/mm/yyyy o dd/mm/yy
    pat_iso = re.compile(r'\b(\d{4})/(\d{1,2})/(\d{1,2})\b')        # yyyy/mm/dd
    # textual: 17 SEP 2025  |  17/SEP/2025  |  17 SEP. 2025  (acepta variantes)
    months_alt = r'(?:ENE|ENERO|FEB|FEBRERO|MAR|MARZO|ABR|ABRIL|MAY|MAYO|JUN|JUNIO|JUL|JULIO|AGO|AGOSTO|SEP|SEPT|SEPTIEMBRE|OCT|OCTUBRE|NOV|NOVIEMBRE|DIC|DICIEMBRE)'
    pat_text = re.compile(rf'\b(\d{{1,2}})[\s/\.]+{months_alt}[\s/\.]+(\d{{2,4}})\b', flags=re.IGNORECASE)

    fechas_validas = []  # (line_index, datetime_obj)

    for idx, linea in enumerate(lineas):
        if re.search(r'VENCIMEN', linea, flags=re.IGNORECASE):
            continue

        # 1) dd/mm/yyyy
        for m in pat_num.finditer(linea):
            d, mo, y = m.groups()
            try:
                d = int(d); mo = int(mo); y = int(y if len(y) == 4 else ("20" + y))
                fecha_obj = datetime(y, mo, d)
            except Exception:
                fecha_obj = None
            if fecha_obj:
                fechas_validas.append((idx, fecha_obj))

        # 2) yyyy/mm/dd
        for m in pat_iso.finditer(linea):
            y, mo, d = m.groups()
            try:
                d = int(d); mo = int(mo); y = int(y)
                fecha_obj = datetime(y, mo, d)
            except Exception:
                fecha_obj = None
            if fecha_obj:
                fechas_validas.append((idx, fecha_obj))

        # 3) textual months (17 SEP 2025, 17/SEP/2025, 17.sep.2025, etc.)
        for m in pat_text.finditer(linea):
            d_str = m.group(1)
            # month text lo extraemos directamente desde el slice del match
            # el patrón capturó día y año; para el mes tomamos el texto entre
            # el día y el año dentro del match original
            whole = m.group(0)
            # extraer la parte del mes (entre el primer número y el año)
            mid = re.sub(r'^\s*\d{1,2}[\s/\.]+', '', whole)
            mid = re.sub(r'[\s/\.]+\d{2,4}\s*$', '', mid)
            mes_txt = mid.strip().upper().replace('.', '')
            if mes_txt:
                mes_key = mes_txt[:3]  # "SEPTIEMBRE" -> "SEP"
                mes_num = meses_3.get(mes_key)
            else:
                mes_num = None

            try:
                d = int(d_str)
                if mes_num:
                    y = m.group(2)
                    y = int(y if len(y) == 4 else ("20" + y))
                    fecha_obj = datetime(y, mes_num, d)
                else:
                    fecha_obj = None
            except Exception:
                fecha_obj = None

            if fecha_obj:
                fechas_validas.append((idx, fecha_obj))

    if debug:
        print("Fechas candidatas encontradas:", [(i, f.strftime("%Y-%m-%d")) for i, f in fechas_validas])

    if not fechas_validas:
        return None

    # Filtrar por rango razonable (últimos 5 años y no muy futuras)
    hoy = datetime.now()
    fechas_filtradas = [(i, f) for i, f in fechas_validas if (hoy - timedelta(days=5*365)) <= f <= (hoy + timedelta(days=1))]
    if not fechas_filtradas:
        # si no quedan por filtro, usar las originales (por si documento viejo)
        fechas_filtradas = fechas_validas

    # Elegir según proximidad a la línea "FECHA EMISIÓN" o la más arriba si no hay referencia
    if fecha_ref_idx is not None:
        fechas_filtradas.sort(key=lambda x: (abs(x[0] - fecha_ref_idx), x[0]))
    else:
        fechas_filtradas.sort(key=lambda x: x[0])  # la primera (más arriba)

    mejor_fecha = fechas_filtradas[0][1]
    return mejor_fecha.strftime("%Y-%m-%d")

def detectar_ruc(texto: str) -> Optional[str]:
    """
    Detecta un RUC válido de 11 dígitos en boletas o facturas electrónicas.
    - Prioriza líneas con 'RUC' (incluyendo errores OCR tipo 'RUO', 'PUC', 'RUG').
    - Evita RUC bloqueados (ej. RUC de la empresa).
    - Corrige errores comunes de OCR dentro de los números.
    - Solo considera RUC válidos (11 dígitos, empieza en 10, 15, 16, 17 o 20).
    """

    if not texto:
        return None

    RUC_EXCLUIDOS = {"20508558997"}  # RUC de la empresa que no queremos capturar

    texto = texto.upper()
    lineas = texto.splitlines()
    lineas = lineas[:15]  # Solo primeras 15 líneas

    posibles_ruc = []

    patrones_ruc = ["RUC", "RU0", "RUO", "RUG", "PUC"]

    for linea in lineas:
        # --- Si la línea tiene palabras clave, buscar números de 11 dígitos ---
        if any(p in linea for p in patrones_ruc):
            rucs = re.findall(r"\b[\dA-Z]{11}\b", linea)  # Incluye letras confusas
            for r in rucs:
                # 🔹 Normalizar errores típicos dentro del número
                r_norm = (
                    r.replace("C", "0")
                     .replace("D", "0")
                     .replace("O", "0")
                     .replace("I", "1")
                     .replace("L", "1")
                     .replace("S", "5")
                )
                if r_norm not in RUC_EXCLUIDOS and r_norm[:2] in {"10", "15", "16", "17", "20"}:
                    posibles_ruc.append(r_norm)

    if posibles_ruc:
        return posibles_ruc[0]

    # --- Fallback: buscar cualquier número de 11 dígitos corregido en primeras 15 líneas ---
    for linea in lineas:
        rucs = re.findall(r"\b[\dA-Z]{11}\b", linea)
        for r in rucs:
            r_norm = (
                r.replace("C", "0")
                 .replace("D", "0")
                 .replace("O", "0")
                 .replace("I", "1")
                 .replace("L", "1")
                 .replace("S", "5")
            )
            if r_norm not in RUC_EXCLUIDOS and r_norm[:2] in {"10", "15", "16", "17", "20"}:
                return r_norm

    return None

def detectar_razon_social(texto: str, ruc: Optional[str] = None, debug: bool = False) -> str:
    if not texto:
        return "RAZÓN SOCIAL DESCONOCIDA"

    import re

    texto_norm = re.sub(r"\s{2,}", " ", texto.strip())
    texto_norm = texto_norm.upper()

    # 🔹 Diccionario de RUC conocidos (personalizable)
    ruc_mapeo = {
        "20100041953": "RIMAC SEGUROS Y REASEGUROS",
        "20600082524": "CONSULTORIO DENTAL ACEVEDO EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA",
        # puedes seguir agregando aquí
    }
    if ruc and ruc in ruc_mapeo:
        return ruc_mapeo[ruc]

    reemplazos = {
        "5,A,": "S.A.", "5A": "S.A.", "5.A": "S.A.", "5 ,A": "S.A.",
        "$.A.C": "S.A.C", "S , A": "S.A", "S . A . C": "S.A.C", "S . A": "S.A",
        "3.A.C.": "S.A.C", "SA.": "S.A.", "SAC.": "S.A.C",
        "E.I.R.L.": "E.I.R.L", "EIRL.": "E.I.R.L",
    }
    for k, v in reemplazos.items():
        texto_norm = texto_norm.replace(k, v)

    lineas = [l.strip(" ,.-") for l in texto_norm.splitlines() if l.strip()]

    exclusiones = [r"V\s*&\s*C\s*CORPORATION", r"VC\s*CORPORATION", r"V\&C"]
    patron_exclusion = re.compile(
        r"^(RUC|R\.U\.C|BOLETA|FACTURA|ELECTRONICA|ELECTRÓNICA|CLIENTE|DIRECCION|OFICINA|CAL|JR|AV|PSJE|MZA|LOTE|ASC|TELF|CIUDAD|PROV)",
        flags=re.IGNORECASE
    )

    nuevas_lineas = []
    for l in lineas:
        l = re.split(r"R\.?\s*U\.?\s*C.*", l)[0].strip()
        l = re.split(r"\b[FBE]\d{3,}-\d+", l)[0].strip()
        l = re.sub(r"\b(FACTURA|BOLETA|ELECTRONICA|ELECTRÓNICA)\b", "", l).strip()
        if ruc:
            l = l.replace(ruc, "").strip()
        if l:
            nuevas_lineas.append(l)
    lineas = nuevas_lineas

    lineas_validas = [
        l for l in lineas[:30]
        if not any(re.search(pat, l, flags=re.IGNORECASE) for pat in exclusiones)
        and not patron_exclusion.match(l)
    ]

    terminaciones = [
        r"S\.?A\.?C\.?$", r"S\.?A\.?$", r"E\.?I\.?R\.?L\.?$",
        r"SOCIEDAD ANONIMA CERRADA$", r"SOCIEDAD ANONIMA$",
        r"EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA$",
        r"RESPONSABILIDAD LIMITADA$",
    ]

    razon_social = None

    # 1️⃣ Buscar coincidencia exacta con terminación legal
    for linea in lineas_validas:
        if any(re.search(term, linea) for term in terminaciones):
            razon_social = linea.strip()
            break

    # 2️⃣ Reconstrucción flexible (combina hasta 3 seguidas, incluso si hay una basura en medio)
    if not razon_social and len(lineas_validas) > 1:
        for i in range(len(lineas_validas)-1):
            combinado = " ".join(lineas_validas[i:i+3])
            for term in terminaciones:
                if re.search(term, combinado):
                    razon_social = re.sub(r"\s+", " ", combinado).strip()
                    break
            if razon_social:
                break

    # 3️⃣ Fallback: nombre más largo válido (ej. RIMAC SEGUROS Y REASEGUROS)
    if not razon_social:
        candidatos = [l for l in lineas_validas if len(l.split()) >= 2]
        if candidatos:
            razon_social = max(candidatos, key=len)

    if razon_social:
        razon_social = re.sub(r"[\s,:;\-]*(R\.?\s*U\.?\s*C.*)+$", "", razon_social).strip()
        razon_social = re.sub(r"\b(FACTURA|BOLETA|ELECTRONICA|ELECTRÓNICA|OFICINA)\b", "", razon_social).strip()
        if ruc:
            razon_social = razon_social.replace(ruc, "").strip()

    resultado = razon_social if razon_social else "RAZÓN SOCIAL DESCONOCIDA"

    if debug:
        print("🔹 Razón Social detectada:", resultado)

    return resultado

def normalizar_monto(monto: str) -> Optional[str]:
    """
    Normaliza un monto detectado por OCR:
    - Convierte ',' a '.' si corresponde.
    - Elimina separadores de miles.
    Retorna None si el monto no es válido.
    """
    if not monto:
        return None

    monto = monto.replace(" ", "").replace(",", ".")
    # Quitar separadores de miles si hay
    partes = monto.split(".")
    if len(partes) > 2:
        # ejemplo: 1.234.567,89 -> 1234567.89
        monto = "".join(partes[:-1]) + "." + partes[-1]

    try:
        return f"{Decimal(monto):.2f}"
    except InvalidOperation:
        return None

def detectar_total(texto: str) -> str:
    """
    Detecta el importe total en boletas/facturas a partir del OCR.
    Estrategia jerárquica:
      1) Buscar montos en líneas con palabras clave (TOTAL, IMPORTE TOTAL, etc.).
      2) Buscar montos con prefijo S/.
      3) Fallback: el monto más alto del texto.
    Retorna '0.00' si no encuentra nada.
    """
    if not texto:
        return "0.00"

    texto_norm = texto.upper()

    # Correcciones OCR típicas para S/
    texto_norm = (
        texto_norm.replace("S . /", "S/")
                  .replace("S-/", "S/")
                  .replace("S.", "S/")
                  .replace("S /", "S/")
    )

    lineas = texto_norm.splitlines()
    candidatos_prioritarios = []

    # Paso 1: líneas con palabras clave de total
    for linea in lineas:
        if re.search(r"(TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|MONTO\s+TOTAL|TOTAL\s+FACTURA|TOTAL\s*$)", linea):
            montos = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
            for m in montos:
                normal = normalizar_monto(m)
                if normal:
                    candidatos_prioritarios.append(Decimal(normal))

    if candidatos_prioritarios:
        return f"{max(candidatos_prioritarios).quantize(Decimal('0.00'))}"

    # Paso 2: montos con prefijo S/ (tomar todos, no solo el primero)
    montos_prefijo = []
    for m in re.findall(r"S/?\s*([\d.,]+\s?[.,]\d{2})", texto_norm):
        normal = normalizar_monto(m)
        if normal:
            montos_prefijo.append(Decimal(normal))

    if montos_prefijo:
        return f"{max(montos_prefijo).quantize(Decimal('0.00'))}"

    # Paso 3: buscar todos los montos con 2 decimales y elegir el mayor
    decs = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", texto_norm)
    montos = []
    for d in decs:
        normal = normalizar_monto(d)
        if normal:
            try:
                montos.append(Decimal(normal))
            except InvalidOperation:
                pass

    if montos:
        return f"{max(montos).quantize(Decimal('0.00'))}"

    return "0.00"

# ==========================#
# PROCESAMIENTO GENERAL OCR #
# ==========================#
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def procesar_datos_ocr(texto: str, debug: bool = True) -> Dict[str, Optional[str]]:
    """
    Procesa el texto OCR de un documento (boleta/factura).
    Ejecuta detectores de RUC, Razón Social, Nº de Documento, Fecha y Total.
    Devuelve un diccionario con los datos extraídos.
    """
    msg_inicio = "🔥 DETECTOR NUMERO DOCUMENTO EJECUTADO"
    if debug:
        print(msg_inicio)
    else:
        logger.info(msg_inicio)

    if not texto:
        return {"ruc": None, "razon_social": "RAZÓN SOCIAL DESCONOCIDA",
                "numero_documento": "ND", "fecha": None, "total": "0.00"}

    # --- Preprocesamiento ligero ---
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    primeras_lineas = lineas[:50]

    # --- Debug/log de las primeras 50 líneas ---
    debug_msg = ["\n📝 OCR LINEAS CRUDAS (máx 50 líneas):", "=" * 60]
    for i, linea in enumerate(primeras_lineas):
        linea_corta = (linea[:120] + '...') if len(linea) > 120 else linea
        debug_msg.append(f"{i+1:02d}: {linea_corta}")
    debug_msg.append("=" * 60 + "\n")

    if debug:
        print("\n".join(debug_msg))
    else:
        for m in debug_msg:
            logger.info(m)

    # --- Detectores individuales ---
    ruc = detectar_ruc(texto)
    razon_social = detectar_razon_social(texto, ruc)
    numero_doc = detectar_numero_documento(texto)
    fecha = detectar_fecha(texto)
    total = detectar_total(texto)

    # --- Debug/log de resultados detectados ---
    datos_msg = [
        f"  - RUC              : {ruc}",
        f"  - Razón Social     : {razon_social}",
        f"  - Número Documento : {numero_doc}",
        f"  - Fecha            : {fecha}",
        f"  - Total            : {total}"
    ]
    if debug:
        print("🔹 Datos detectados por OCR:")
        print("\n".join(datos_msg))
        print()
    else:
        logger.info("🔹 Datos detectados por OCR:")
        for m in datos_msg:
            logger.info(m)

    return {
        "ruc": ruc or None,
        "razon_social": razon_social or "RAZÓN SOCIAL DESCONOCIDA",
        "numero_documento": numero_doc or "ND",
        "fecha": fecha or None,
        "total": total or "0.00",
    }

# ===================#
# CONVERSION DE PDFs #
# ===================#
def archivo_a_imagenes(archivo) -> Tuple[List[Image.Image], List[str]]:
    """
    Convierte un archivo PDF o imagen a una lista de objetos PIL.Image.
    Estrategia híbrida:
      1) Si es PDF, intenta extraer texto nativo con pdfplumber.
      2) Si encuentra texto útil (RUC, TOTAL, FECHA, etc.), lo devuelve sin OCR.
      3) Si no encuentra texto o es un escaneo, convierte a imágenes para OCR.
      4) Si es imagen, la devuelve directamente para OCR.
    
    Args:
        archivo: file-like object (PDF o imagen).
    
    Returns:
        Tuple[List[Image.Image], List[str]]:
            - Lista de imágenes PIL (para OCR si es necesario)
            - Lista de textos nativos por página (si se detectaron)
    """
    imagenes: List[Image.Image] = []
    textos_nativos: List[str] = []

    try:
        archivo.seek(0)
        nombre = getattr(archivo, "name", "").lower()

        # Detectar si es PDF
        es_pdf = nombre.endswith(".pdf") or archivo.read(4)[:4] == b"%PDF"
        archivo.seek(0)

        if es_pdf:
            pdf_bytes = archivo.read()

            # Extraer texto nativo
            try:
                with pdfplumber.open(archivo) as pdf:
                    for page in pdf.pages:
                        text = page.extract_text() or ""
                        textos_nativos.append(text)
                
                texto_completo = " ".join(textos_nativos).upper()
                if any(palabra in texto_completo for palabra in ["RUC", "TOTAL", "FECHA", "IMPORTE"]):
                    print("📄 Texto nativo detectado en PDF, se usará sin OCR.")
                    return [], textos_nativos

            except Exception as e:
                print(f"⚠️ Error leyendo texto nativo del PDF: {e}")

            # Convertir PDF a imágenes
            try:
                imagenes = convert_from_bytes(pdf_bytes, dpi=300)
                print("🖼️ PDF convertido a imágenes para OCR.")
            except PDFInfoNotInstalledError:
                print("❌ Poppler no está instalado o no se encuentra en el PATH.")
            except PDFPageCountError:
                print(f"❌ PDF corrupto o ilegible: {nombre}")
            except Exception as e:
                print(f"❌ Error convirtiendo PDF a imágenes ({nombre}): {e}")

        else:
            # Intentar abrir como imagen
            try:
                img = Image.open(archivo)
                img.load()
                imagenes = [img]
            except UnidentifiedImageError:
                print(f"❌ Archivo no es una imagen válida: {nombre}")
            except Exception as e:
                print(f"❌ Error abriendo imagen ({nombre}): {e}")

    except Exception as e:
        print(f"❌ Error procesando el archivo ({nombre}): {e}")

    return imagenes, textos_nativos

def debug_ocr_pdf(archivo):
    """
    Convierte un PDF o imagen a texto usando pytesseract
    y muestra línea por línea el OCR crudo.
    """
    try:
        archivo.seek(0)
        if archivo.name.lower().endswith(".pdf"):
            pdf_bytes = archivo.read()
            imagenes = convert_from_bytes(pdf_bytes, dpi=300)
        else:
            img = Image.open(archivo)
            img.load()
            imagenes = [img]

        for i, img in enumerate(imagenes):
            texto_crudo = pytesseract.image_to_string(img, lang="spa")
            print(f"\n📄 Página {i+1} texto crudo:\n{'-'*50}\n{texto_crudo}\n{'-'*50}")

    except Exception as e:
        print(f"❌ Error procesando OCR: {e}")
          
# ============================#
# GENERAR NUMERO DE OPERACIÓN #
# ============================#
def generar_numero_operacion(prefix: str = "DOC") -> str:
    """
    Genera un número de operación único, usando fecha + contador.
    Formato: PREFIX-YYYYMMDD-XXXX
    """
    from boleta_api.models import DocumentoGasto

    with transaction.atomic():
        hoy = date.today()
        fecha_str = hoy.strftime("%Y%m%d")

        ultimo = (
            DocumentoGasto.objects
            .filter(numero_operacion__startswith=f"{prefix}-{fecha_str}")
            .order_by('-numero_operacion')
            .first()
        )

        if ultimo:
            try:
                ultimo_num = int(ultimo.numero_operacion.split("-")[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0

        nuevo_num = ultimo_num + 1
        return f"{prefix}-{fecha_str}-{nuevo_num:04d}"

# =======================================#
#  SECCIÓN GESTIÓN DE CAJA / SOLICITUDES #
# =======================================#
def aprobar_solicitud(solicitud_id):
    from boleta_api.models import CajaDiaria, Solicitud
    solicitud = Solicitud.objects.get(id=solicitud_id)
    if solicitud.estado == "Aprobada":
        return
    solicitud.estado = "Aprobada"
    solicitud.save()
    
    hoy = date.today()
    caja, _ = CajaDiaria.objects.get_or_create(fecha=hoy)
    monto_actual = float(caja.monto_gastado or 0)
    monto_suma = float(solicitud.monto_soles or 0)
    caja.monto_gastado = monto_actual + monto_suma
    caja.actualizar_sobrante()

def set_monto_diario(fecha: date, monto: float):
    from boleta_api.models import CajaDiaria
    caja, creado = CajaDiaria.objects.get_or_create(fecha=fecha, defaults={
        'monto_inicial': monto,
        'monto_gastado': 0,
        'monto_sobrante': monto,
    })
    if not creado:
        caja.monto_inicial = monto
        caja.actualizar_sobrante()
    return caja

def validar_caja_abierta():
    from boleta_api.models import EstadoCaja
    estado_caja = EstadoCaja.objects.order_by('-fecha_hora').first()
    if not estado_caja or estado_caja.estado != EstadoCaja.ABIERTO:
        raise ValidationError("La caja no está abierta.")

def validar_arqueo_unico_por_fecha(fecha):
    from boleta_api.models import ArqueoCaja
    if ArqueoCaja.objects.filter(fecha=fecha, cerrada=False).exists():
        raise ValidationError("Ya existe un arqueo abierto para esta fecha.")

def validar_solicitudes_no_asociadas(solicitudes_ids):
    from boleta_api.models import Solicitud
    for sid in solicitudes_ids:
        if Solicitud.objects.filter(id=sid, arqueo__cerrada=False).exists():
            raise ValidationError(f"La solicitud {sid} ya está asociada a un arqueo abierto.")
