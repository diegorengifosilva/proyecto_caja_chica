
# boleta_api/extraccion.py
import re
import os
import unicodedata
import pytesseract
import numpy as np
from boleta_api.db_connection import get_connection
from typing import Optional, Dict, List, Union, Tuple
from datetime import datetime, date, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from pdf2image import convert_from_bytes
from pdf2image.exceptions import PDFInfoNotInstalledError, PDFPageCountError
from PIL import Image, UnidentifiedImageError, ImageFilter, ImageOps, ExifTags
import pdfplumber
from decimal import Decimal, InvalidOperation
import logging
from boleta_api.ocr_utils import procesar_imagen_camara, procesar_pdf
from concurrent.futures import ThreadPoolExecutor
import multiprocessing
import tempfile
import cv2
from pyzbar import pyzbar

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
    Normaliza un monto detectado por OCR a formato '0.00'.
    Maneja:
    - 1,234.56 | 1.234,56 | 1234,56 | 1234.56 | 1.234.567,89 | 1,234,567.89
    - Con o sin símbolos extraños (S/, $, etc.)
    Retorna str -> '0.00' o None si no se puede parsear.
    """
    if not monto_txt:
        return None

    import re
    from decimal import Decimal, InvalidOperation

    # 🔹 Limpiar caracteres no numéricos relevantes
    s = re.sub(r"[^\d,.\-]", "", monto_txt)
    if not s:
        return None

    # 🔹 Determinar separador decimal
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):  # 1.234,56 -> 1234.56
            s = s.replace(".", "").replace(",", ".")
        else:  # 1,234.56 -> 1234.56
            s = s.replace(",", "")
    elif "," in s:
        if s.count(",") == 1:  # 1234,56 -> 1234.56
            s = s.replace(",", ".")
        else:  # 1,234,567,89 -> 1234567.89
            partes = s.split(",")
            s = "".join(partes[:-1]) + "." + partes[-1]
    elif "." in s:
        partes = s.split(".")
        if len(partes) > 2:  # 1.234.567.89 -> 1234567.89
            s = "".join(partes[:-1]) + "." + partes[-1]

    # 🔹 Convertir a Decimal
    try:
        d = Decimal(s)
        return f"{d.quantize(Decimal('0.00'))}"
    except (InvalidOperation, ValueError):
        return None

# ========================#
# DETECTORES INDIVIDUALES #
# ========================#
def detectar_numero_documento(texto: str, numero_qr: str = None, debug: bool = False) -> str:
    """
    Detecta el número de documento (boleta/factura/nota/ticket) en OCR de PDFs o imágenes.
    Prioriza el número obtenido desde QR si se proporciona.

    Características:
    - Maneja variantes de separador: Nº, N°, No, Nro.
    - Permite series alfanuméricas (ej: F581, E001, B020, BE01, FE01).
    - Detecta correlativos largos (hasta 14 dígitos).
    - Prioriza prefijos válidos de comprobantes SUNAT.
    - Devuelve el candidato más confiable.
    """
    import re
    from .extraccion import detectar_ruc

    # --- Paso 0: usar QR si está disponible ---
    if numero_qr:
        numero_qr_clean = numero_qr.strip()
        if numero_qr_clean:
            # ⚡ Prioridad absoluta: devolver QR directamente
            if debug:
                print(f"[QR] Número de documento priorizado: {numero_qr_clean}")
            return numero_qr_clean

    # --- Paso 1: OCR ---
    if not texto:
        return "ND"

    texto_norm = texto.upper()
    texto_norm = texto_norm.replace("O", "0").replace("I", "1").replace("L", "1")
    lineas = [l.strip() for l in texto_norm.splitlines() if l.strip()]

    # Detectar RUC/DNI para excluirlos
    ruc_valor = detectar_ruc(texto) or ""
    dni_matches = re.findall(r"\b\d{8}\b", texto_norm)
    ignorar = [ruc_valor] + dni_matches

    # Prefijos válidos de comprobantes SUNAT
    prefijos_validos = (
        "F", "FF", "FA", "FE", "FEN", "B", "BB", "E", "NC", "ND",
        "BE", "BV", "TK"
    )

    # Patrón robusto: serie (1-3 letras) + opcional Nº + correlativo
    patron = re.compile(
        r"\b([A-Z]{1,3}\d{0,4})\s*(?:N[°ºO.]?\s*)?[-]?\s*(\d{1,14})\b"
    )

    candidatos = []
    for idx, linea in enumerate(lineas):
        for match in patron.finditer(linea):
            serie, correlativo = match.groups()
            numero = f"{serie}-{correlativo}"

            # Ignorar coincidencias con RUC/DNI
            if any(numero.replace("-", "") == x for x in ignorar):
                continue

            # Prioridad heurística
            prioridad = 0
            if serie.startswith(prefijos_validos):
                prioridad += 3
            if re.match(r"[A-Z]+\d+", serie):
                prioridad += 1
            prioridad += len(correlativo) // 4

            candidatos.append((numero, prioridad, idx))

    if debug:
        print("Candidatos detectados (OCR):", candidatos)

    if candidatos:
        candidatos.sort(key=lambda x: (-x[1], -len(x[0]), x[2]))
        return candidatos[0][0]

    return "ND"

def detectar_tipo_documento(texto: str, debug: bool = False) -> str:
    """
    Detecta automáticamente el tipo de documento a partir del texto OCR.
    Retorna: 'BOLETA', 'BOLETA ELECTRONICA', 'FACTURA', 'FACTURA ELECTRONICA', 
             'FACTURA DE VENTA ELECTRONICA', 'HONORARIOS' o 'OTROS'.
    """
    if not texto:
        return "OTROS"

    # 🔹 Normalizar texto: mayúsculas y sin tildes
    texto_norm = re.sub(r"\s{2,}", " ", texto.strip()).upper()
    texto_norm = unicodedata.normalize('NFKD', texto_norm).encode('ASCII', 'ignore').decode('ASCII')

    # 🔹 Patrones flexibles y ampliados
    patrones = {
        "FACTURA DE VENTA ELECTRONICA": [
            r"FACTURA\s*DE\s*VENTA\s*ELECTRONICA",
        ],
        "FACTURA ELECTRONICA": [
            r"FACTURA\s*ELECTRONICA",
        ],
        "FACTURA": [
            r"\bFACTURA\b", 
            r"\bF\-\d{3,}",  # Ej: F001-1234
        ],
        "BOLETA DE VENTA ELECTRONICA": [
            r"BOLETA\s*DE\s*VENTA\s*ELECTRONICA",
        ],
        "BOLETA ELECTRONICA": [
            r"BOLETA\s*ELECTRONICA",
        ],
        "BOLETA": [
            r"\bBOLETA\b",
            r"\bBOL\b",
        ],
        "HONORARIOS": [
            r"RECIBO\s*POR\s*HONORARIOS",
            r"HONORARIOS",
            r"R\.H\."
        ],
    }

    tipo_detectado = "OTROS"

    # 🔹 Orden de prioridad (primero electrónicos)
    orden_prioridad = [
        "FACTURA DE VENTA ELECTRONICA",
        "FACTURA ELECTRONICA",
        "FACTURA",
        "BOLETA DE VENTA ELECTRONICA",
        "BOLETA ELECTRONICA",
        "BOLETA",
        "HONORARIOS"
    ]

    for tipo in orden_prioridad:
        for pat in patrones[tipo]:
            if re.search(pat, texto_norm):
                tipo_detectado = tipo
                break
        if tipo_detectado != "OTROS":
            break

    if debug:
        print(f"🔹 Tipo de Documento detectado: {tipo_detectado}")

    return tipo_detectado

def detectar_fecha(texto: str, qr_data: Optional[str] = None, debug: bool = False) -> Optional[str]:
    """
    Detecta la fecha de emisión en boletas/facturas y normaliza a YYYY-MM-DD.
    - Prioriza la fecha extraída del QR si existe.
    - Soporta formatos dd/mm/yyyy, yyyy/mm/dd, dd-mm-yyyy, dd.mm.yyyy
    - Soporta meses escritos (ene, septiembre, sept, etc.)
    - Prioriza la línea que contenga "FECHA EMISIÓN" si existe
    - Ignora líneas con "VENCIMIENTO" y rangos tipo "01 AL 05/08/2025"
    """

    # 🔹 Revisar QR primero
    if qr_data:
        campos = qr_data.split("|")
        if len(campos) >= 7:
            qr_fecha = campos[6].strip()
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d.%m.%Y"):
                try:
                    f = datetime.strptime(qr_fecha, fmt)
                    if debug:
                        print("🔹 Fecha desde QR:", f.strftime("%Y-%m-%d"))
                    return f.strftime("%Y-%m-%d")
                except:
                    continue
            if debug:
                print("⚠️ Fecha QR no parseada:", qr_fecha)

    if not texto:
        return None

    # --- Normalizar texto ---
    txt = texto.replace('\r', '\n')
    txt = re.sub(r'[-–—]', '/', txt)  # convierte "-" en "/"
    txt = re.sub(r'\.(?=\d)', '/', txt)
    txt = re.sub(r'\s+', ' ', txt)
    lineas = [l.strip() for l in txt.splitlines() if l.strip()]

    # --- Patrones básicos ---
    pat_num = re.compile(r'(\d{1,2}/\d{1,2}/\d{2,4})')
    pat_iso = re.compile(r'(\d{4}/\d{1,2}/\d{1,2})')

    meses_map = {
        "ENE": 1, "ENERO": 1,
        "FEB": 2, "FEBRERO": 2,
        "MAR": 3, "MARZO": 3,
        "ABR": 4, "ABRIL": 4,
        "MAY": 5, "MAYO": 5,
        "JUN": 6, "JUNIO": 6,
        "JUL": 7, "JULIO": 7,
        "AGO": 8, "AGOSTO": 8,
        "SEP": 9, "SEPT": 9, "SEPTIEMBRE": 9,
        "OCT": 10, "OCTUBRE": 10,
        "NOV": 11, "NOVIEMBRE": 11,
        "DIC": 12, "DICIEMBRE": 12
    }
    meses_alt = "|".join(meses_map.keys())
    pat_text = re.compile(r'(\d{1,2})[\s/\.]+(' + meses_alt + ')[\s/\.]+(\d{2,4})', flags=re.IGNORECASE)

    fecha_ref_idx = None
    doc_ref_idx = None
    for i, l in enumerate(lineas):
        if re.search(r'FECHA\s*(DE\s*)?EMIS', l, flags=re.IGNORECASE):
            fecha_ref_idx = i
        if re.search(r'\bF\d{3,}-\d{3,}\b', l):
            doc_ref_idx = i

    fechas_validas = []
    for idx, linea in enumerate(lineas):
        if re.search(r'VENCIMEN', linea, flags=re.IGNORECASE):
            continue
        if re.search(r'\b\d{1,2}\s*AL\s*\d{1,2}/\d{1,2}/\d{4}\b', linea):
            continue

        for m in pat_num.finditer(linea):
            try:
                partes = m.group(1).split('/')
                y = int(partes[2]) + (2000 if len(partes[2]) == 2 else 0)
                d, mo = int(partes[0]), int(partes[1])
                fechas_validas.append((idx, datetime(y, mo, d)))
            except:
                continue

        for m in pat_iso.finditer(linea):
            try:
                y, mo, d = [int(x) for x in m.group(1).split('/')]
                fechas_validas.append((idx, datetime(y, mo, d)))
            except:
                continue

        for m in pat_text.finditer(linea):
            try:
                d = int(m.group(1))
                mes_txt = m.group(2).upper().replace("0", "O")
                mes = meses_map.get(mes_txt)
                y = int(m.group(3)) if len(m.group(3)) == 4 else 2000 + int(m.group(3))
                if mes:
                    fechas_validas.append((idx, datetime(y, mes, d)))
            except:
                continue

    if debug:
        print("Fechas candidatas:", [(i, f.strftime("%Y-%m-%d")) for i, f in fechas_validas])

    if not fechas_validas:
        return None

    hoy = datetime.now()
    fechas_filtradas = [(i, f) for i, f in fechas_validas if (hoy - timedelta(days=5*365)) <= f <= (hoy + timedelta(days=1))]
    if not fechas_filtradas:
        fechas_filtradas = fechas_validas

    if fecha_ref_idx is not None:
        for i, f in fechas_filtradas:
            if i == fecha_ref_idx:
                return f.strftime("%Y-%m-%d")
    elif doc_ref_idx is not None:
        fechas_filtradas.sort(key=lambda x: (abs(x[0] - doc_ref_idx), x[0]))
    else:
        fechas_filtradas.sort(key=lambda x: x[0])

    return fechas_filtradas[0][1].strftime("%Y-%m-%d")

def detectar_ruc(texto: str, qr_data: Optional[str] = None, debug: bool = False) -> Optional[str]:
    """
    Detecta un RUC válido de 11 dígitos en boletas o facturas electrónicas.
    Prioridad:
      1. RUC desde QR si existe y es válido.
      2. OCR en primeras 10 líneas del texto.
    Reglas:
      - Solo considera RUC válidos (11 dígitos, empieza en 10, 15, 16, 17 o 20).
      - Corrige errores comunes de OCR.
      - Excluye RUCs no deseados.
    """

    import re

    RUC_EXCLUIDOS = {"20508558997"}  # ejemplo: RUC que no queremos capturar

    # 🔹 Mapeo de errores frecuentes OCR
    mapa_errores = str.maketrans({
        "C": "0", "D": "0", "O": "0", "Q": "0",
        "I": "1", "L": "1",
        "S": "5",
        "B": "8",
        "G": "6",
        "Z": "2"
    })

    # ==========================================================
    # 1. Intentar extraer desde QR
    # ==========================================================
    if qr_data:
        try:
            campos = qr_data.split("|")
            if campos:
                qr_ruc = re.sub(r"[^\d]", "", campos[0].strip())  # solo números
                if (qr_ruc not in RUC_EXCLUIDOS 
                    and qr_ruc[:2] in {"10","15","16","17","20"} 
                    and len(qr_ruc) == 11):
                    if debug:
                        print("✅ RUC detectado desde QR:", qr_ruc)
                    return qr_ruc
        except Exception as e:
            if debug:
                print("⚠️ Error al procesar QR:", e)

    # ==========================================================
    # 2. Intentar extraer desde OCR (primeras 10 líneas)
    # ==========================================================
    texto = (texto or "").upper()
    lineas = texto.splitlines()[:10]
    patrones_ruc = ["RUC", "RU0", "RUO", "RUG", "PUC"]

    posibles_ruc = []
    for linea in lineas:
        linea_limpia = re.sub(r"[\s:.]", "", linea)
        linea_limpia = re.sub(r"(RUC)(\d{11})", r"\1 \2", linea_limpia)

        if any(p in linea_limpia for p in patrones_ruc):
            rucs = re.findall(r"\b[\dA-Z]{11}\b", linea_limpia)
            for r in rucs:
                r_norm = r.translate(mapa_errores)
                r_norm = re.sub(r"[^\d]", "", r_norm)
                if (r_norm not in RUC_EXCLUIDOS 
                    and r_norm[:2] in {"10","15","16","17","20"} 
                    and len(r_norm) == 11):
                    posibles_ruc.append(r_norm)

    if posibles_ruc:
        if debug:
            print("✅ RUC detectado desde OCR:", posibles_ruc[0])
        return posibles_ruc[0]

    # ==========================================================
    # 3. Fallback: buscar cualquier número de 11 dígitos válido
    # ==========================================================
    for linea in lineas:
        linea_limpia = re.sub(r"[^\dA-Z]", "", linea)
        rucs = re.findall(r"\b[\dA-Z]{11}\b", linea_limpia)
        for r in rucs:
            r_norm = r.translate(mapa_errores)
            r_norm = re.sub(r"[^\d]", "", r_norm)
            if (r_norm not in RUC_EXCLUIDOS 
                and r_norm[:2] in {"10","15","16","17","20"} 
                and len(r_norm) == 11):
                if debug:
                    print("✅ RUC fallback detectado:", r_norm)
                return r_norm

    if debug:
        print("❌ No se detectó RUC válido")
    return None

def detectar_razon_social(texto: str, ruc: Optional[str] = None, debug: bool = False) -> str:
    if not texto:
        return ""

    import re

    # 🔹 Normalizar texto OCR
    texto_norm = re.sub(r"\s{2,}", " ", texto.strip()).upper()

    # 🔹 Consultar DB primero
    if ruc:
        try:
            with get_connection() as conn, conn.cursor() as cur:
                cur.execute(
                    "SELECT razon_social FROM boleta_api_razonsocial WHERE ruc = %s LIMIT 1;",
                    (ruc,)
                )
                row = cur.fetchone()
                if row:
                    resultado_db = row[0].strip()
                    if debug:
                        print("🔹 Razón Social desde DB:", resultado_db)
                    return resultado_db
        except Exception as e:
            print("Error al consultar DB:", e)

    # 🔹 Reemplazos OCR
    reemplazos_regex = {
        r"5[,\.]?\s*A": "S.A.",
        r"\bS[\s\./,-]*A[\s\./,-]*C\b": "S.A.C",
        r"\bS[\s\./,-]*A\b": "S.A.",
        r"\bE[\s\./,-]*I[\s\./,-]*R[\s\./,-]*L\b": "E.I.R.L",
    }
    for patron, reemplazo in reemplazos_regex.items():
        texto_norm = re.sub(patron, reemplazo, texto_norm)

    # 🔹 Quitar ruido
    texto_norm = re.sub(
        r"\b(FACTURA|BOLETA|ELECTRONICA|ELECTRÓNICA|RAZ\.?SOCIAL:?)\b",
        "", texto_norm, flags=re.IGNORECASE
    )

    # 🔹 Tomar solo las primeras 10 líneas
    lineas = [l.strip(" ,.-") for l in texto_norm.splitlines() if l.strip()][:10]

    # --- BLOQUEOS ---
    patron_exclusion = re.compile(
        r"^(RUC|R\.U\.C|CLIENTE|DIRECCION|OFICINA|CAL|JR|AV|PSJE|MZA|LOTE|ASC|TELF|CIUDAD|PROV)",
        flags=re.IGNORECASE
    )
    patron_empresa = re.compile(
        r"V\s*&?\s*C\s+CORPORATION(\s+S\.?A\.?C\.?| SOCIEDAD ANONIMA CERRADA)?",
        flags=re.IGNORECASE
    )
    patron_fecha = re.compile(
        r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b"
    )
    patron_finales_ruidosos = re.compile(
        r"(REPRESENTACION IMPRESA|PARA VER EL DOCUMENTO|HTTPS?:|WWW\.)",
        flags=re.IGNORECASE
    )

    nuevas_lineas = []
    for l in lineas:
        l = re.split(r"R\.?\s*U\.?\s*C.*", l)[0].strip()
        l = re.split(r"\b[FBE]\d{3,}-\d+", l)[0].strip()
        if ruc:
            l = l.replace(ruc, "").strip()
        l = re.sub(r"^(ES|LA|EL|LOS|LAS)\s+", "", l)

        if not l:
            continue
        if patron_exclusion.match(l):
            continue
        if patron_empresa.search(l):
            continue
        if patron_fecha.search(l):
            continue
        if patron_finales_ruidosos.search(l):
            continue

        nuevas_lineas.append(l)

    lineas_validas = nuevas_lineas

    terminaciones = [
        r"S\.?A\.?C\.?$", r"S\.?A\.?$", r"E\.?I\.?R\.?L\.?$",
        r"SOCIEDAD ANONIMA CERRADA$", r"SOCIEDAD ANONIMA$",
        r"EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA$",
        r"RESPONSABILIDAD LIMITADA$",
        r"UNIVERSIDAD$", r"INSTITUTO$", r"COLEGIO$", r"CENTRO$", r"ACADEMIA$",
    ]

    def puntuar(linea: str) -> int:
        score = 0
        if any(re.search(term, linea) for term in terminaciones):
            score += 5
        if re.search(r"S\.A\.C|S\.A\.|E\.I\.R\.L", linea):
            score += 3
        palabras_empresa = ["CORPORATION", "IMPORTACIONES", "CONSTRUCTORA", "CONSULTING", "INDUSTRIAL"]
        if any(p in linea for p in palabras_empresa):
            score += 2
        if len(linea.split()) >= 2:
            score += 1
        return score

    # 🔹 Buscar candidato principal
    mejor_candidato = None
    mejor_score = -1
    for linea in lineas_validas:
        score = puntuar(linea)
        if score > mejor_score:
            mejor_candidato = linea
            mejor_score = score

    razon_social = None
    if mejor_candidato and mejor_score >= 3:
        razon_social = mejor_candidato

    # 🔹 Combinaciones de 2 a 4 líneas
    if not razon_social:
        for window in range(2, 5):
            for i in range(len(lineas_validas) - window + 1):
                combinado = " ".join(lineas_validas[i:i+window])
                if any(re.search(term, combinado) for term in terminaciones):
                    razon_social = re.sub(r"\s+", " ", combinado).strip()
                    break
            if razon_social:
                break

    # 🔹 Limpiar restos
    if razon_social:
        razon_social = re.sub(r"[\s,:;\-]*(R\.?\s*U\.?\s*C.*)+$", "", razon_social).strip()
        if ruc:
            razon_social = razon_social.replace(ruc, "").strip()

    resultado = razon_social if razon_social else ""

    if debug:
        print("🔹 Líneas válidas (máx 10):", lineas_validas)
        print("🔹 Razón Social detectada:", resultado if resultado else "(vacío)")

    return resultado

def detectar_total(texto: str, qr_data: Optional[str] = None, debug: bool = False) -> str:
    """
    Detecta el total a pagar en boletas/facturas.
    - Prioriza monto extraído del QR si existe.
    - Luego busca líneas con palabras clave de total, montos en letras y finalmente cualquier monto válido.
    """

    # 🔹 Priorizar QR primero
    if qr_data:
        campos = qr_data.split("|")
        if len(campos) >= 6:
            qr_total = campos[5].strip()
            try:
                total_decimal = Decimal(qr_total.replace(",", ""))
                if debug:
                    print("🔹 Total desde QR:", total_decimal)
                return f"{total_decimal.quantize(Decimal('0.00'))}"
            except Exception as e:
                if debug:
                    print(f"⚠️ Total QR no parseado: {qr_total} ({e})")
                # sigue con OCR si falla

    if not texto:
        return "0.00"

    # 🔹 Normalizar texto
    texto_norm = (
        texto.upper()
        .replace("S . /", "S/")
        .replace("S-/", "S/")
        .replace("S.", "S/")
        .replace("S /", "S/")
    )
    lineas = [l.strip() for l in texto_norm.splitlines() if l.strip()]

    # 🔹 Palabras clave
    claves_total = ["TOTAL A PAGAR", "IMPORTE TOTAL", "MONTO TOTAL", "TOTAL FACTURA", "TOTAL"]
    ignorar_monto = ["GRAVADA", "IGV", "DESCUENTO", "RETENCION", "PERIODO", "OP. GRAVADAS"]

    # 🔹 Normalización robusta de montos OCR
    def normalizar_monto(monto_txt: str) -> Optional[Decimal]:
        if not monto_txt:
            return None
        s = re.sub(r"[^\d,.\-]", "", monto_txt)
        if not s:
            return None

        if "," in s and "." in s:
            if s.rfind(",") > s.rfind("."):
                s = s.replace(".", "")
                s = s.replace(",", ".")
            else:
                s = s.replace(",", "")
        elif "," in s:
            if s.count(",") == 1:
                s = s.replace(",", ".")
            else:
                partes = s.split(",")
                s = "".join(partes[:-1]) + "." + partes[-1]
        elif "." in s:
            partes = s.split(".")
            if len(partes) > 2:
                s = "".join(partes[:-1]) + "." + partes[-1]

        try:
            return Decimal(s).quantize(Decimal("0.00"))
        except:
            return None

    # 1️⃣ Montos con palabras clave
    montos_prioritarios = []
    for linea in lineas:
        if any(c in linea for c in claves_total) and not any(i in linea for i in ignorar_monto):
            montos = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
            for m in montos:
                n = normalizar_monto(m)
                if n is not None:
                    montos_prioritarios.append(n)
    if montos_prioritarios:
        return f"{max(montos_prioritarios).quantize(Decimal('0.00'))}"

    # 2️⃣ Montos en letras
    UNIDADES = {"CERO":0, "UNO":1, "DOS":2, "TRES":3, "CUATRO":4, "CINCO":5,
                "SEIS":6, "SIETE":7, "OCHO":8, "DIEZ":10, "ONCE":11, "DOCE":12,
                "TRECE":13, "CATORCE":14, "QUINCE":15, "DIECISÉIS":16, "DIECISIETE":17,
                "DIECIOCHO":18, "DIECINUEVE":19, "VEINTE":20, "VEINTIUNO":21, "VEINTIDOS":22,
                "VEINTITRES":23, "VEINTICUATRO":24, "TREINTA":30, "CUARENTA":40, "CINCUENTA":50,
                "SESENTA":60, "SETENTA":70, "OCHENTA":80, "NOVENTA":90}
    DECENAS = {"CIEN":100, "CIENTO":100, "DOSCIENTOS":200, "TRESCIENTOS":300, "CUATROCIENTOS":400,
               "QUINIENTOS":500, "SEISCIENTOS":600, "SETECIENTOS":700, "OCHOCIENTOS":800, "NOVECIENTOS":900}
    MULTIPLICADORES = {"MIL":1000, "MILLON":1000000, "MILLONES":1000000}

    def letras_a_numero(texto_letras: str) -> Optional[Decimal]:
        texto_letras = texto_letras.upper().replace("-", " ")
        decimales = 0
        match = re.search(r"(\d{1,2})/100", texto_letras)
        if match:
            decimales = int(match.group(1))
            texto_letras = re.sub(r"\d{1,2}/100", "", texto_letras)

        total = 0
        parcial = 0
        for palabra in texto_letras.split():
            if palabra in UNIDADES:
                parcial += UNIDADES[palabra]
            elif palabra in DECENAS:
                parcial += DECENAS[palabra]
            elif palabra in MULTIPLICADORES:
                parcial = max(parcial,1) * MULTIPLICADORES[palabra]
                total += parcial
                parcial = 0
            elif palabra == "Y":
                continue
        total += parcial
        total += decimales/100
        return Decimal(str(round(total,2))) if total>0 else None

    montos_letras = []
    for linea in lineas:
        if "SOLES" in linea or "/100" in linea:
            n = letras_a_numero(linea)
            if n is not None:
                montos_letras.append(n)
    if montos_letras:
        return f"{max(montos_letras).quantize(Decimal('0.00'))}"

    # 3️⃣ Todos los montos descartando palabras ignoradas
    montos_texto = []
    for linea in lineas:
        if any(i in linea for i in ignorar_monto):
            continue
        decs = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
        for d in decs:
            n = normalizar_monto(d)
            if n is not None:
                montos_texto.append(n)
    if montos_texto:
        return f"{max(montos_texto).quantize(Decimal('0.00'))}"

    return "0.00"

# ==========================#
# PROCESAMIENTO GENERAL OCR #
# ==========================#
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def procesar_datos_ocr(entrada: Union[str, Image.Image], debug: bool = True) -> Dict[str, Optional[str]]:
    """
    Procesa texto OCR de un documento (boleta/factura) optimizado:
    - Si recibe `str` con texto → lo usa directamente.
    - Si recibe `PIL.Image` → optimiza, deskew automático y OCR avanzado.
    - Si recibe ruta a PDF → extrae texto nativo primero, OCR solo si es necesario, multipágina concurrente.
    - También intenta extraer datos clave de QR si existe (ruc, número de documento, fecha, total).
    Devuelve un diccionario con RUC, Razón Social, Nº Documento, Fecha, Total, Tipo Documento,
    e imprime en consola qué campos se tomaron desde el QR y el texto completo del QR.
    """
    msg_inicio = "🔥 DETECTOR NUMERO DOCUMENTO EJECUTADO"
    if debug:
        print(msg_inicio)
    else:
        logger.info(msg_inicio)

    texto = None
    qr_datos = {"ruc_emisor": None, "numero_documento": None, "fecha_emision": None, "total": None}
    qr_campos_usados = {"ruc": False, "numero_documento": False, "fecha": False, "total": False}

    # --- Imagen ---
    if isinstance(entrada, Image.Image):
        img_opt = procesar_imagen_camara(entrada)
        img_cv = cv2.cvtColor(np.array(img_opt), cv2.COLOR_RGB2BGR)
        img_cv = corregir_perspectiva(img_cv, debug=debug)
        img_opt = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))

        from pyzbar import pyzbar
        import numpy as np
        qr_codes = pyzbar.decode(np.array(img_opt))
        if qr_codes:
            contenido = qr_codes[0].data.decode("utf-8", errors="ignore").strip()
            if debug:
                print("\n📡 TEXTO QR CRUDO DETECTADO (IMAGEN):")
                print(contenido)
                print("=" * 60 + "\n")
            else:
                logger.info(f"[QR] Texto QR crudo detectado (IMAGEN): {contenido}")

            partes = contenido.split("|")
            if len(partes) >= 4:
                serie = partes[2].strip()
                correlativo = partes[3].strip().zfill(8)
                qr_datos["numero_documento"] = f"{serie}-{correlativo}" if serie else None
            if len(partes) >= 7:
                qr_datos["ruc_emisor"] = partes[0].strip() or None
                qr_datos["total"] = partes[5].strip() or None
                qr_datos["fecha_emision"] = partes[6].strip() or None

            # DEBUG inmediato
            if debug:
                print(f"[QR] Datos capturados -> RUC: {qr_datos['ruc_emisor']}, "
                      f"NUM_DOC: {qr_datos['numero_documento']}, "
                      f"Total: {qr_datos['total']}, Fecha: {qr_datos['fecha_emision']}")
        else:
            if debug:
                print("⚪ No se detectó QR en esta IMAGEN.\n")
            else:
                logger.info("[QR] No se detectó QR en esta IMAGEN.")

        img_opt = asegurar_orientacion_vertical(img_opt, debug=debug)
        if img_opt.width > 1200 or img_opt.height < 1000:
            h = max(int(img_opt.height * 1200 / img_opt.width), 1000)
            w = int(img_opt.width * h / img_opt.height)
            img_opt = img_opt.resize((w, h), Image.Resampling.LANCZOS)

        img_gray = img_opt.convert("L")
        img_eq = ImageOps.equalize(img_gray)
        img_sharp = img_eq.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
        img_denoised = img_sharp.filter(ImageFilter.MedianFilter(size=3))
        img_bin = img_denoised.point(lambda x: 0 if x < 150 else 255, "1")
        texto = pytesseract.image_to_string(img_bin, lang="spa")

    # --- PDF ---
    elif isinstance(entrada, str) and entrada.lower().endswith(".pdf") and os.path.exists(entrada):
        paginas = procesar_pdf(entrada, dpi=140)
        def procesar_pagina(pag):
            txt = pag.extract_text() if hasattr(pag, "extract_text") else ""
            txt = (txt or "").strip()
            try:
                from pyzbar import pyzbar
                import numpy as np
                img_pag = pag.to_image(resolution=100).original if hasattr(pag, "to_image") else None
                if isinstance(img_pag, Image.Image):
                    qr_codes = pyzbar.decode(np.array(img_pag))
                    if qr_codes:
                        contenido = qr_codes[0].data.decode("utf-8", errors="ignore").strip()
                        if debug:
                            print("\n📡 TEXTO QR CRUDO DETECTADO (PDF):")
                            print(contenido)
                            print("=" * 60 + "\n")
                        else:
                            logger.info(f"[QR] Texto QR crudo detectado (PDF): {contenido}")
                        partes = contenido.split("|")
                        if len(partes) >= 4:
                            serie = partes[2].strip()
                            correlativo = partes[3].strip().zfill(8)
                            qr_datos["numero_documento"] = f"{serie}-{correlativo}" if serie else None
                        if len(partes) >= 7:
                            qr_datos["ruc_emisor"] = partes[0].strip() or None
                            qr_datos["total"] = partes[5].strip() or None
                            qr_datos["fecha_emision"] = partes[6].strip() or None
                        if debug:
                            print(f"[QR] Datos capturados (PDF) -> RUC: {qr_datos['ruc_emisor']}, "
                                  f"NUM_DOC: {qr_datos['numero_documento']}, "
                                  f"Total: {qr_datos['total']}, Fecha: {qr_datos['fecha_emision']}")
            except Exception as e:
                logger.warning(f"[QR] No se pudo extraer QR de página PDF: {e}")

            if not any(k in txt.upper() for k in ["RUC", "TOTAL", "FECHA"]):
                img_pag = pag.to_image(resolution=100).original if hasattr(pag, "to_image") else pag
                if isinstance(img_pag, Image.Image):
                    img_pag = asegurar_orientacion_vertical(img_pag, debug=debug)
                    if img_pag.width > 1200 or img_pag.height < 1000:
                        h = max(int(img_pag.height * 1200 / img_pag.width), 1000)
                        w = int(img_pag.width * h / img_pag.height)
                        img_pag = img_pag.resize((w, h), Image.Resampling.LANCZOS)
                    img_gray = img_pag.convert("L")
                    img_bin = img_gray.point(lambda x: 0 if x < 150 else 255, "1")
                    txt = pytesseract.image_to_string(img_bin, lang="spa")
            return txt

        max_threads = min(len(paginas), multiprocessing.cpu_count())
        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            textos = list(executor.map(procesar_pagina, paginas))
        texto = "\n".join(textos)

    # --- Texto ya extraído ---
    elif isinstance(entrada, str):
        texto = entrada
    else:
        raise ValueError("Entrada no válida: debe ser texto OCR, PIL.Image o ruta a PDF")

    if not texto:
        return {
            "ruc": qr_datos["ruc_emisor"] or None,
            "razon_social": "RAZÓN SOCIAL DESCONOCIDA",
            "numero_documento": qr_datos.get("numero_documento") or "ND",
            "fecha": qr_datos["fecha_emision"] or None,
            "total": qr_datos["total"] or "0.00",
            "tipo_documento": "OTROS"
        }

    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    primeras_lineas = lineas[:100]

    debug_msg = ["\n📝 OCR LINEAS CRUDAS (máx 100 líneas):", "=" * 60]
    for i, linea in enumerate(primeras_lineas):
        linea_corta = (linea[:120] + "...") if len(linea) > 120 else linea
        debug_msg.append(f"{i+1:02d}: {linea_corta}")
    debug_msg.append("=" * 60 + "\n")

    if debug:
        print("\n".join(debug_msg))
    else:
        for m in debug_msg:
            logger.info(m)

    # --- Detectores individuales ---
    ruc = detectar_ruc(texto) or qr_datos["ruc_emisor"]
    if qr_datos["ruc_emisor"]:
        qr_campos_usados["ruc"] = True

    razon_social = detectar_razon_social(texto, ruc)

    numero_doc = qr_datos["numero_documento"] or detectar_numero_documento(texto)
    if qr_datos["numero_documento"]:
        qr_campos_usados["numero_documento"] = True

    fecha = detectar_fecha(texto) or qr_datos["fecha_emision"]
    if qr_datos["fecha_emision"]:
        qr_campos_usados["fecha"] = True

    total = detectar_total(texto) or qr_datos["total"]
    if qr_datos["total"]:
        qr_campos_usados["total"] = True

    tipo_documento = detectar_tipo_documento(texto, debug=debug)

    if debug:
        print("🔹 Datos detectados por OCR (con QR backup):")
        print(f"  - RUC              : {ruc} {'(desde QR)' if qr_campos_usados['ruc'] else ''}")
        print(f"  - Razón Social     : {razon_social}")
        print(f"  - Número Documento : {numero_doc} {'(desde QR)' if qr_campos_usados['numero_documento'] else ''}")
        print(f"  - Fecha            : {fecha} {'(desde QR)' if qr_campos_usados['fecha'] else ''}")
        print(f"  - Total            : {total} {'(desde QR)' if qr_campos_usados['total'] else ''}")
        print(f"  - Tipo Documento   : {tipo_documento}\n")
    else:
        logger.info("🔹 Datos detectados por OCR (con QR backup):")
        for k, v in [("RUC", ruc), ("Razón Social", razon_social),
                     ("Número Documento", numero_doc), ("Fecha", fecha),
                     ("Total", total), ("Tipo Documento", tipo_documento)]:
            logger.info(f"{k}: {v}")

    return {
        "ruc": ruc or None,
        "razon_social": razon_social or None,
        "numero_documento": numero_doc or "ND",
        "fecha": fecha or None,
        "total": total or "0.00",
        "tipo_documento": tipo_documento.upper() if tipo_documento else "OTROS",
    }

def asegurar_orientacion_vertical(img: Image.Image, debug: bool = False) -> Image.Image:
    """
    Garantiza que la imagen quede en orientación vertical.
    - Corrige EXIF si existe.
    - Usa proporción width/height.
    - Aplica deskew con pytesseract OSD.
    """
    from PIL import ExifTags
    import pytesseract

    # 🔹 Corrección EXIF
    try:
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == 'Orientation':
                break
        exif = getattr(img, "_getexif", lambda: None)()
        if exif is not None and orientation in exif:
            val = exif[orientation]
            if val == 3:
                img = img.rotate(180, expand=True)
            elif val == 6:
                img = img.rotate(270, expand=True)
            elif val == 8:
                img = img.rotate(90, expand=True)
            if debug:
                print(f"📸 Corrección EXIF aplicada: {val}")
    except Exception as e:
        if debug:
            print(f"⚠️ No se pudo aplicar corrección EXIF: {e}")

    # 🔹 Rotar si la imagen sigue horizontal
    if img.width > img.height:
        img = img.rotate(90, expand=True)
        if debug:
            print("📐 Imagen girada automáticamente para orientación vertical")

    # 🔹 Deskew con pytesseract OSD
    try:
        osd = pytesseract.image_to_osd(img)
        rotation = int([line for line in osd.split("\n") if "Rotate:" in line][0].split(":")[1].strip())
        if rotation != 0:
            img = img.rotate(rotation, expand=True)
            if debug:
                print(f"🔄 Deskew aplicado, rotación {rotation}°")
    except Exception as e:
        if debug:
            print(f"⚠️ No se pudo aplicar deskew OSD: {e}")

    return img

def preprocesar_imagen_para_ocr(ruta_imagen: str) -> str:
    """
    Aplica mejoras de imagen antes de OCR:
      - Convierte a escala de grises
      - Ecualización adaptativa de contraste (CLAHE)
      - Reducción de ruido (filtro bilateral)
      - Binarización adaptativa
      - Redimensiona ancho máx 1200px si es grande
      - Corrección ligera de orientación (deskew básico por contornos)
    Devuelve la ruta a un archivo temporal optimizado.
    """
    try:
        # Cargar imagen
        img = cv2.imread(ruta_imagen, cv2.IMREAD_COLOR)
        if img is None:
            return ruta_imagen  # fallback: usar original

        # Escala de grises
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Mejorar contraste con CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        gray_eq = clahe.apply(gray)

        # Suavizado para reducir ruido
        denoised = cv2.bilateralFilter(gray_eq, d=9, sigmaColor=75, sigmaSpace=75)

        # Binarización adaptativa
        binarizada = cv2.adaptiveThreshold(
            denoised, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            35, 11
        )

        # Deskew básico: detectar ángulo dominante por contornos
        try:
            coords = np.column_stack(np.where(binarizada > 0))
            angulo = cv2.minAreaRect(coords)[-1]
            if angulo < -45:
                angulo = -(90 + angulo)
            else:
                angulo = -angulo

            if abs(angulo) > 0.5:  # solo corrige si el ángulo es relevante
                (h, w) = binarizada.shape
                M = cv2.getRotationMatrix2D((w // 2, h // 2), angulo, 1.0)
                binarizada = cv2.warpAffine(
                    binarizada, M, (w, h),
                    flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
                )
        except Exception:
            pass  # no romper si no puede deskew

        # Redimensionar si es muy grande
        h, w = binarizada.shape
        if w > 1200:
            escala = 1200 / w
            binarizada = cv2.resize(
                binarizada,
                (1200, int(h * escala)),
                interpolation=cv2.INTER_AREA
            )

        # Guardar temporal
        fd, ruta_final = tempfile.mkstemp(suffix=".png", dir=os.path.dirname(ruta_imagen))
        os.close(fd)
        cv2.imwrite(ruta_final, binarizada)

        return ruta_final

    except Exception as e:
        logger.error(f"[OCR Utils] Error preprocesando imagen {ruta_imagen}: {e}", exc_info=True)
        return ruta_imagen

def corregir_perspectiva(img: np.ndarray, debug: bool = False) -> np.ndarray:
    """
    Detecta el documento en la imagen y aplica corrección de perspectiva
    para obtener un recorte “plano”, ideal para OCR.
    - img: imagen en BGR (OpenCV)
    - debug: muestra pasos intermedios
    Devuelve la imagen corregida.
    """
    import cv2
    import numpy as np

    # Convertir a gris
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Filtro para suavizar y resaltar bordes
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(gray, 50, 150)

    # Buscar contornos
    contornos, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contornos = sorted(contornos, key=cv2.contourArea, reverse=True)[:5]

    doc_cnt = None
    for c in contornos:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            doc_cnt = approx
            break

    if doc_cnt is None:
        if debug:
            print("⚠️ No se detectó contorno de documento, devolviendo imagen original")
        return img

    # Ordenar puntos en tl, tr, br, bl
    pts = doc_cnt.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")

    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left

    (tl, tr, br, bl) = rect

    # Calcular dimensiones del nuevo rectángulo
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(int(widthA), int(widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(int(heightA), int(heightB))

    # Transformación perspectiva
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warp = cv2.warpPerspective(img, M, (maxWidth, maxHeight))

    if debug:
        print(f"✔️ Perspectiva corregida: {maxWidth}x{maxHeight}")

    return warp

# ==================#
# EXTRACCION CON QR #
# ==================#
logger = logging.getLogger(__name__)

def extraer_datos_qr(img: Image.Image, debug: bool = False) -> Dict[str, Optional[str]]:
    """
    Extrae datos crudos desde el QR en la imagen PIL.
    Retorna:
      - ruc_emisor (str)
      - numero_documento (str)
      - total (str)
      - fecha_emision (str)
      - tipo_documento (str)

    Funciona para imágenes de cámara y PDFs.
    Optimización: busca primero en la parte inferior de la imagen (último 30%)
    """
    datos = {
        "ruc_emisor": None,
        "numero_documento": None,
        "total": None,
        "fecha_emision": None,
        "tipo_documento": None
    }

    try:
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        _, bin_img = cv2.threshold(gray, 120, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        h, w = bin_img.shape
        zona_inferior = bin_img[int(h*0.7):h, :]

        contenido = None
        qr_codes = pyzbar.decode(zona_inferior)
        if qr_codes:
            contenido = qr_codes[0].data.decode("utf-8", errors="ignore").strip()
        else:
            qr_codes = pyzbar.decode(bin_img)
            if qr_codes:
                contenido = qr_codes[0].data.decode("utf-8", errors="ignore").strip()
            else:
                detector = cv2.QRCodeDetector()
                data, points, _ = detector.detectAndDecode(img_cv)
                if data:
                    contenido = data.strip()
                else:
                    logger.info("[QR] No se encontró código QR en la imagen.")
                    return datos

        if debug and contenido:
            print("\n📡 TEXTO QR EXTRAIDO:")
            print(contenido)
            print("="*60 + "\n")
        logger.info(f"[QR] Texto QR extraído: {contenido}")

        partes = contenido.split("|")
        if len(partes) >= 4:
            # RUC
            datos["ruc_emisor"] = partes[0].strip() or None

            # Tipo de documento (campo [1])
            tipo_map = {
                "01": "FACTURA ELECTRÓNICA",
                "03": "BOLETA DE VENTA ELECTRÓNICA",
                "07": "NOTA DE CRÉDITO ELECTRÓNICA",
                "08": "NOTA DE DÉBITO ELECTRÓNICA"
            }
            tipo_codigo = partes[1].strip() if len(partes) > 1 else None
            datos["tipo_documento"] = tipo_map.get(tipo_codigo, "OTROS")

            # Número de documento (serie + correlativo)
            serie = partes[2].strip() if len(partes) > 2 else ""
            correlativo = partes[3].strip() if len(partes) > 3 else ""
            correlativo = correlativo.zfill(8)
            datos["numero_documento"] = f"{serie}-{correlativo}" if serie else None

            # Total
            numeros = []
            ruc_clean = datos["ruc_emisor"].replace("-", "") if datos["ruc_emisor"] else ""
            numdoc_clean = datos["numero_documento"].replace("-", "") if datos["numero_documento"] else ""

            for p in partes[4:]:
                p_clean = p.replace(",", ".")
                if re.match(r"^\d+(\.\d+)?$", p_clean):
                    p_int = p_clean.replace(".", "")
                    if p_int in (ruc_clean, numdoc_clean):
                        continue
                    if len(p_int) == 11 or len(p_int) == 8:
                        continue
                    if float(p_clean) == 0:
                        continue
                    numeros.append(float(p_clean))

            if numeros:
                datos["total"] = "{:.2f}".format(max(numeros))
            else:
                datos["total"] = None

            # Fecha: normalizado a YYYY-MM-DD
            fecha = None
            fecha_patron = re.compile(r"(\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})")
            for p in partes:
                m = fecha_patron.match(p.strip())
                if m:
                    f = m.group(0)
                    if "/" in f:  # DD/MM/YYYY → YYYY-MM-DD
                        dia, mes, anio = f.split("/")
                        fecha = f"{anio}-{mes}-{dia}"
                    elif "-" in f and len(f.split("-")[0]) == 4:  # YYYY-MM-DD
                        fecha = f
                    elif "-" in f and len(f.split("-")[0]) == 2:  # DD-MM-YYYY
                        dia, mes, anio = f.split("-")
                        fecha = f"{anio}-{mes}-{dia}"
                    break
            datos["fecha_emision"] = fecha

            logger.info(f"[QR] Datos capturados -> RUC: {datos['ruc_emisor']}, "
                        f"NUM_DOC: {datos['numero_documento']}, "
                        f"Total: {datos['total']}, Fecha: {datos['fecha_emision']}, "
                        f"TipoDoc: {datos['tipo_documento']}")
        else:
            logger.warning(f"[QR] Estructura inesperada en QR: {partes}")

    except Exception as e:
        if debug:
            print(f"⚠️ Error extrayendo QR: {e}")
        logger.error(f"[QR] Error extrayendo datos: {e}", exc_info=True)

    return datos

def detectar_qr(ruta_archivo: str, debug: bool = False) -> dict:
    """
    Intenta detectar un QR en el archivo de imagen dado.
    Retorna dict con ruc, total, fecha si se detecta.
    Si no hay QR válido, retorna {}.
    """
    try:
        with Image.open(ruta_archivo) as img:
            datos = extraer_datos_qr(img, debug=debug)
            if datos and any(datos.values()):
                return {
                    "ruc": datos.get("ruc_emisor"),
                    "total": datos.get("total"),
                    "fecha": datos.get("fecha_emision"),
                }
    except Exception as e:
        if debug:
            print(f"[QR] Error en detectar_qr: {e}")

    return {}

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
