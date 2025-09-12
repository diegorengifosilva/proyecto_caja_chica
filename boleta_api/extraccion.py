# boleta_api/extraccion.py
import re
import requests
import unicodedata
from typing import Optional, Dict
from datetime import datetime, date, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError

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
    - Quita acentos y caracteres no ASCII.
    - Elimina símbolos extraños pero conserva: . , - / S/
    - Corrige espacios alrededor de símbolos útiles.
    - Borra numeritos o basura al inicio de las líneas.
    - Compacta espacios múltiples.
    """
    if not texto:
        return ""

    # --- Paso 1: quitar acentos ---
    texto = unicodedata.normalize('NFKD', texto)
    texto = texto.encode('ascii', 'ignore').decode('utf-8')

    # --- Paso 2: reemplazos típicos de OCR ---
    reemplazos = {
        "5A": "S.A",
        "$.A.C": "S.A.C",
        "S , A": "S.A",
        "S . A . C": "S.A.C",
        "S . A": "S.A",
    }
    for k, v in reemplazos.items():
        texto = texto.replace(k, v)

    # --- Paso 3: eliminar símbolos no útiles ---
    # Permitimos letras, números y los símbolos útiles . , - / &
    texto = re.sub(r"[^A-Z0-9ÁÉÍÓÚÑa-zñ\.\,\-\/&\s]", " ", texto)

    # --- Paso 4: limpiar espacios alrededor de guiones y slashes ---
    texto = re.sub(r"\s*-\s*", "-", texto)
    texto = re.sub(r"\s*/\s*", "/", texto)

    # --- Paso 5: limpiar numeritos iniciales de línea (ej: '1 TAI LOY' -> 'TAI LOY') ---
    lineas = []
    for linea in texto.splitlines():
        linea = linea.strip()
        linea = re.sub(r"^\d+\s+", "", linea)  # quita números al inicio
        if linea:
            lineas.append(linea)

    # --- Paso 6: compactar espacios múltiples ---
    texto_limpio = "\n".join(re.sub(r"\s{2,}", " ", l) for l in lineas)

    return texto_limpio.strip()

def normalizar_monto(monto_txt: str) -> Optional[str]:
    """
    Normaliza un monto textual a formato '0.00':
    - Maneja '1,234.56', '1.234,56', '1234,56', '1234.56'
    - Elimina símbolos extraños
    """
    if not monto_txt:
        return None

    s = re.sub(r"[^\d,.\-]", "", monto_txt)

    if not s:
        return None

    # Caso: contiene punto y coma → decidir cuál es decimal
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            # 1.234,56 → 1234.56
            s = s.replace(".", "").replace(",", ".")
        else:
            # 1,234.56 → 1234.56
            s = s.replace(",", "")
    elif "," in s:
        if s.count(",") == 1:
            s = s.replace(",", ".")
        else:
            partes = s.split(",")
            s = "".join(partes[:-1]) + "." + partes[-1]

    try:
        return f"{float(s):.2f}"
    except:
        return None

# ========================#
# DETECTORES INDIVIDUALES #
# ========================#
def detectar_numero_documento(texto: str) -> Optional[str]:
    """
    Detecta números de documento (boleta/factura) con tolerancia a errores de OCR.
    Ej: F561-0166803, F5E1-0166803, B123-0000123, etc.
    """
    # Normalizar caracteres confusos de OCR
    texto = texto.replace("O", "0").replace("I", "1").replace("E", "6")

    # Permitir un punto o espacio antes
    patron = r"[.\s]*([FB]\d{3})[- ]?(\d{6,8})"
    match = re.search(patron, texto, re.IGNORECASE)
    if match:
        serie, correlativo = match.groups()
        return f"{serie.upper()}-{correlativo}"

    return None

def detectar_fecha(texto: str) -> str:
    """
    Detecta fechas en distintos formatos y corrige errores comunes de OCR.
    Normaliza a YYYY-MM-DD.
    """

    if not texto:
        return None

    texto_mayus = texto.upper()

    # Correcciones típicas de OCR antes de buscar
    reemplazos = {
        "E/": "11/",   # E -> 11
        "O/": "01/",   # O -> 0
        "I/": "1/",    # I -> 1
        "l/": "1/",    # l -> 1
        "S/": "5/",    # S -> 5
    }
    for k, v in reemplazos.items():
        texto_mayus = texto_mayus.replace(k, v)

    # Patrones ampliados
    patrones = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",  # dd/mm/yyyy o dd-mm-yy
        r"\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b",    # yyyy-mm-dd
        r"\b\d{1,2}\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{2,4}\b",  
        r"\b(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{1,2},?\s+\d{2,4}\b",
    ]

    fechas_crudas = []
    for patron in patrones:
        fechas_crudas.extend(re.findall(patron, texto_mayus))

    if not fechas_crudas:
        return None

    fechas_validas = []
    for f in fechas_crudas:
        f = f.strip()
        f = f.replace("-", "/")

        # Diccionario meses
        meses = {
            "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
            "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12
        }

        fecha_obj = None

        # Caso dd/mm/yyyy o dd/mm/yy
        try:
            partes = f.split("/")
            if len(partes) == 3:
                d, m, y = partes
                if len(d) == 1: d = "0" + d
                if len(m) == 1: m = "0" + m
                if len(y) == 2: y = "20" + y
                fecha_obj = datetime.strptime(f"{d}/{m}/{y}", "%d/%m/%Y")
        except Exception:
            pass

        # Caso con mes texto
        if not fecha_obj:
            for abbr, num in meses.items():
                if abbr in f:
                    f_tmp = f.replace(abbr, str(num))
                    f_tmp = re.sub(r"\s+", "/", f_tmp)
                    try:
                        fecha_obj = datetime.strptime(f_tmp, "%d/%m/%Y")
                    except:
                        try:
                            fecha_obj = datetime.strptime(f_tmp, "%m/%d/%Y")
                        except:
                            pass

        if fecha_obj:
            if datetime.now() - timedelta(days=5*365) <= fecha_obj <= datetime.now():
                fechas_validas.append(fecha_obj)

    if not fechas_validas:
        return None

    mejor_fecha = max(fechas_validas)
    return mejor_fecha.strftime("%Y-%m-%d")

def detectar_ruc(texto: str) -> Optional[str]:
    """
    Detecta un RUC válido de 11 dígitos, excluyendo los propios (lista negra).
    - Busca cualquier grupo de 11 dígitos y devuelve el primero que NO esté en la lista negra.
    """
    # RUC Excluido
    RUC_EXCLUIDOS= {"20508558997"}

    posibles = re.findall(r"\b\d{11}\b", texto)
    for ruc in posibles:
        if ruc not in RUC_EXCLUIDOS:
            return ruc
    return None

def detectar_razon_social(texto: str) -> Optional[str]:
    """
    Detecta la razón social del proveedor (emisor).
    - Limpia ruido de OCR (5A -> S.A., $.A.C -> S.A.C, etc).
    - Busca primero patrones clásicos (S.A., S.A.C., SAC, SA).
    - Si no encuentra, usa la línea previa al RUC válido.
    - Ignora razón social del cliente (después de CLIE/CLIENTE/RAZ.SOCIAL).
    """

    if not texto:
        return "RAZÓN SOCIAL DESCONOCIDA"

    texto_norm = texto.upper()
    texto_norm = re.sub(r"\s{2,}", " ", texto_norm)

    # --- Correcciones comunes de OCR ---
    reemplazos = {
        "5. A OY": "S.A.",
        "5. A": "S.A.",
        "$.A.C": "S.A.C",
        "S . A . C": "S.A.C",
        "S . A": "S.A",
        "5A": "S.A",
        "SA.": "S.A.",
        "S , A": "S.A",
        "SAC.": "S.A.C",
        "CORPORATION $.A.C": "CORPORATION S.A.C",
    }
    for k, v in reemplazos.items():
        texto_norm = texto_norm.replace(k, v)

    # --- Dividir en líneas y limitar a proveedor ---
    lineas = texto_norm.splitlines()
    proveedor_lineas = []
    for linea in lineas:
        if any(x in linea for x in ["CLIE", "CLIENTE", "RAZ.SOCIAL"]):
            break
        proveedor_lineas.append(linea.strip())

    # --- Lista negra (clientes que no queremos como proveedor) ---
    RAZONES_SOCIALES_EXCLUIDAS = {
        "V & C CORPORATION S.A.C",
        "V6C CORPORATION S.A.C",
        "V 6 C CORPORATION S.A.C",
    }

    # --- Patrones de razón social ---
    patrones = [
        r"([A-Z0-9ÁÉÍÓÚÑ\s\.\-&']+S\.?\s*A\.?\s*C\.?)",  # S.A.C
        r"([A-Z0-9ÁÉÍÓÚÑ\s\.\-&']+S\.?\s*A\.?)",        # S.A
        r"([A-Z0-9ÁÉÍÓÚÑ\s\.\-&']+SAC)",                # SAC pegado
        r"([A-Z0-9ÁÉÍÓÚÑ\s\.\-&']+SA)",                 # SA pegado
    ]

    # --- Intento 1: regex sobre proveedor ---
    for linea in proveedor_lineas[:12]:  # primeras 12 líneas suelen tener la razón social
        for patron in patrones:
            m = re.search(patron, linea)
            if m:
                razon = m.group(1).strip(" ,.-")
                razon = re.sub(r"\s{2,}", " ", razon)
                if len(razon) > 6 and razon not in RAZONES_SOCIALES_EXCLUIDAS:
                    return razon

    # --- Intento 2: fallback, usar línea previa al RUC válido ---
    ruc_match = re.search(r"\b\d{11}\b", texto_norm)
    if ruc_match:
        ruc_line_idx = None
        for idx, linea in enumerate(proveedor_lineas):
            if ruc_match.group(0) in linea:
                ruc_line_idx = idx
                break
        if ruc_line_idx and ruc_line_idx > 0:
            posible_razon = proveedor_lineas[ruc_line_idx - 1].strip(" ,.-")
            if len(posible_razon) > 4 and posible_razon not in RAZONES_SOCIALES_EXCLUIDAS:
                return posible_razon

    return "RAZÓN SOCIAL DESCONOCIDA"

def detectar_total(texto: str) -> str:
    """
    Detecta el importe total del OCR.
    Estrategia jerárquica:
      1) Buscar montos en líneas con palabras clave (TOTAL, IMPORTE, MONTO, NETO).
      2) Buscar montos con prefijo S/.
      3) Fallback: el monto más alto de todo el texto.
    Siempre retorna un string '0.00' si no se encuentra nada.
    """

    if not texto:
        return "0.00"

    texto_norm = texto.upper()

    # 🔹 Paso 1: Escanear línea por línea
    lineas = texto_norm.splitlines()
    candidatos_prioritarios = []
    for linea in lineas:
        if re.search(r"(TOTAL|IMP\.?\s*TOTAL|IMPORTE\s+TOTAL|MONTO\s+TOTAL|NETO)", linea):
            montos = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
            for m in montos:
                normal = normalizar_monto(m)
                if normal:
                    candidatos_prioritarios.append(float(normal))

    if candidatos_prioritarios:
        return f"{max(candidatos_prioritarios):.2f}"

    # 🔹 Paso 2: Buscar montos con prefijo S/
    m = re.search(r"(?:S/?\.?)\s*([\d.,]+\s?[.,]\d{2})", texto_norm)
    if m:
        normal = normalizar_monto(m.group(1))
        if normal:
            return normal.strip()

    # 🔹 Paso 3: Fallback global – el mayor número decimal de todo el texto
    decs = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", texto_norm)
    if decs:
        montos = []
        for d in decs:
            normal = normalizar_monto(d)
            if normal:
                try:
                    montos.append(float(normal))
                except:
                    pass
        if montos:
            return f"{max(montos):.2f}"

    # 🔹 Fallback final: si nada se encontró
    return "0.00"

# ==========================#
# PROCESAMIENTO GENERAL OCR #
# ==========================#
def procesar_datos_ocr(texto: str) -> Dict[str, Optional[str]]:
    lineas = texto.splitlines()
    print("📝 OCR LINEAS CRUDAS:")
    for i, linea in enumerate(lineas[:50]):  # primeras 20
        print(f"{i+1:02d}: {linea}")

    ruc = detectar_ruc(texto)
    razon_social = detectar_razon_social(texto)
    numero_doc = detectar_numero_documento(texto)
    fecha = detectar_fecha(texto)
    total = detectar_total(texto)

    return {
        "ruc": ruc,
        "razon_social": razon_social,
        "numero_documento": numero_doc,
        "fecha": fecha,
        "total": total,
    }

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
