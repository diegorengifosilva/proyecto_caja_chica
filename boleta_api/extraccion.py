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
def detectar_numero_documento(texto: str) -> Optional[str]:
    """
    Detecta el número de documento (boleta o factura) en OCR de imágenes o PDFs.
    Ejemplos válidos: F561-0166803, BA03-07128636, E001-97, B123-98765.

    Estrategia:
      - Normaliza caracteres confusos del OCR (O→0, I→1, S→5 si necesario).
      - Ignora espacios y caracteres extraños entre serie y correlativo.
      - Busca patrón de serie-correlativo (una o dos letras + dígitos) opcionalmente con guion.
      - Prioriza la línea justo debajo del RUC si existe.
      - Fallback: cualquier patrón de 2-8 dígitos consecutivos con guion.
    """
    if not texto:
        return "ND"

    # --- Normalizar OCR ---
    texto_norm = texto.upper()
    texto_norm = (
        texto_norm.replace("O", "0")
                  .replace("I", "1")
                  .replace(" ", "")
                  .replace("L", "1")  # L → 1, típico error OCR
                  .replace("S", "5")  # S → 5 en algunos casos
    )

    lineas = texto_norm.splitlines()

    # --- Localizar índice del RUC si existe ---
    ruc_idx = None
    ruc_match = re.search(r"\b\d{11}\b", texto_norm)
    if ruc_match:
        for i, l in enumerate(lineas):
            if ruc_match.group(0) in l:
                ruc_idx = i
                break

    # --- Patrón principal: serie (1-2 letras) + correlativo (2-8 dígitos) ---
    patron = re.compile(r"\b([A-Z]{1,2}\d{1,3})[- ]?(\d{2,8})\b")

    posibles = []
    for i, linea in enumerate(lineas):
        # Limpiar caracteres raros de OCR
        linea_clean = re.sub(r"[^A-Z0-9\-]", "", linea)
        for match in patron.finditer(linea_clean):
            serie, correlativo = match.groups()
            numero = f"{serie}-{correlativo}"
            # Si está justo debajo del RUC → máxima prioridad
            if ruc_idx is not None and i == ruc_idx + 1:
                return numero
            posibles.append(numero)

    # --- Si hay varios, devolver el primero encontrado ---
    if posibles:
        return posibles[0]

    # --- Fallback: patrón numérico simple, guion opcional ---
    fallback = re.search(r"\b\d{2,4}[-]?\d{2,8}\b", texto_norm)
    if fallback:
        return fallback.group(0)

    return "ND"

def detectar_fecha(texto: str) -> Optional[str]:
    """
    Detecta la fecha de emisión en boletas o facturas electrónicas.
    Normaliza a YYYY-MM-DD.
    
    Mejoras:
      - Corrige errores comunes de OCR en fotos (E/ → 11/, O/ → 01/, I/ → 1/, L/ → 1/).
      - Corrige específicamente "E/07/25" al inicio de línea.
      - Ignora líneas con 'VENCIMIENTO'.
      - Permite fechas con mes en texto (ENE, FEB...).
      - Solo considera fechas válidas: últimos 5 años, no futuras.
    """

    if not texto:
        return None

    texto_mayus = texto.upper()

    # 🔹 Correcciones OCR generales
    reemplazos = {
        "E/": "11/",
        "E": "11",
        "O/": "01/",
        "I/": "1/",
        "L/": "1/",
        "S/": "5/",
        "FECHA DE EMIS10N": "FECHA DE EMISION",
        "FECHA EMIS10N": "FECHA EMISION",
        "FECHA DE EM1SION": "FECHA DE EMISION",
        "FECHA EM1SION": "FECHA EMISION",
        "FECHA DE EMISI0N": "FECHA DE EMISION",
    }
    for k, v in reemplazos.items():
        texto_mayus = texto_mayus.replace(k, v)

    # 🔹 Separar líneas y corregir errores específicos al inicio
    lineas = texto_mayus.splitlines()
    for i, linea in enumerate(lineas):
        # ⚡ Corrección específica para OCR de imágenes
        # E/07/25 → 11/07/25 solo al inicio de línea
        linea = re.sub(r"^\s*E/(\d{2}/\d{2})", r"11/\1", linea)
        lineas[i] = linea

    posibles = []
    for linea in lineas:
        if "VENCIMIENTO" in linea:
            continue
        if "FECHA DE EMISION" in linea or "FECHA EMISION" in linea:
            posibles.append(linea)
        elif "FECHA" in linea:
            posibles.append(linea)

    if not posibles:
        return None

    # 🔹 Patrones de fecha
    patrones = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",  # 14/07/2025, 1-7-25
        r"\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b",    # 2025/07/14
        r"\d{1,2}\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{2,4}",
        r"(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{1,2},?\s+\d{2,4}"
    ]

    meses = {
        "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12
    }

    fechas_validas = []

    for linea in posibles:
        for patron in patrones:
            for f in re.findall(patron, linea):
                f = f.replace("-", "/").strip()
                fecha_obj = None

                # --- Caso dd/mm/yyyy o dd/mm/yy ---
                if "/" in f and f[0].isdigit():
                    partes = f.split("/")
                    if len(partes) == 3:
                        d, m, y = partes
                        try:
                            d = d.zfill(2)
                            m = m.zfill(2)
                            if len(y) == 2:
                                y = "20" + y
                            fecha_obj = datetime.strptime(f"{d}/{m}/{y}", "%d/%m/%Y")
                        except:
                            pass

                # --- Caso con mes en texto ---
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
                    # Solo fechas válidas: últimos 5 años y no futuras
                    hoy = datetime.now()
                    if hoy - timedelta(days=5*365) <= fecha_obj <= hoy + timedelta(days=1):
                        fechas_validas.append(fecha_obj)

    if not fechas_validas:
        return None

    # 🔹 Elegir la más reciente
    mejor_fecha = max(fechas_validas)
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

def detectar_razon_social(texto: str, ruc: Optional[str] = None) -> str:
    """
    Detecta la razón social del proveedor en boletas o facturas electrónicas.
    - Prioriza empresas (S.A., S.A.C., EIRL, SOCIEDAD, CORPORACION, etc.)
    - Combina líneas consecutivas si parecen parte de la misma razón social.
    - Ignora nombres de clientes/usuarios y la propia empresa interna.
    - Bloquea variantes de nuestra empresa.
    - Corrige errores comunes de OCR en nombres de empresas (5,A → S.A., L al inicio, etc.)
    """

    if not texto:
        return "RAZÓN SOCIAL DESCONOCIDA"

    # 🔹 Normalización OCR general
    texto_norm = texto.upper()
    texto_norm = re.sub(r"\s{2,}", " ", texto_norm)

    # 🔹 Reemplazos OCR específicos para empresas
    reemplazos = {
        "5,A,": "S.A.",
        "5A": "S.A.",
        "5.A": "S.A.",
        "5 ,A": "S.A.",
        "$.A.C": "S.A.C",
        "S , A": "S.A",
        "S . A . C": "S.A.C",
        "S . A": "S.A",
        "3.A.C.": "S.A.C",
        "SA.": "S.A.",
        "SAC.": "S.A.C",
        "RETALE": "RETAIL",
        ",": "",   # remover comas sueltas
    }
    for k, v in reemplazos.items():
        texto_norm = texto_norm.replace(k, v)

    # 🔹 Separar líneas y limpiar
    lineas = [l.strip(" ,.-") for l in texto_norm.splitlines() if l.strip()]

    # 🔹 Lista de exclusión explícita (nuestra empresa interna, todas variantes posibles)
    exclusiones = [
        r"V\s*&\s*C\s*CORPORATION",
        r"VC\s*CORPORATION",
    ]

    # 🔹 Excluir líneas que claramente NO son razón social
    excluir = r"^(RAZ\.SOCIAL|CAL\.|AV\.|JR\.|PSJE\.|MZA\.|LOTE\.|ASC\.|RUC|BOLETA|FACTURA|FECHA|DIRECCION|FORMA DE PAGO)"
    lineas_validas = [
        l for l in lineas[:20]
        if not re.match(excluir, l) and not any(re.search(pat, l) for pat in exclusiones)
    ]

    # 🔹 Patrón de empresa
    patrones_empresa = [
        r"S\.?\s*A\.?\s*C", r"S\.?\s*A\.?", r"SAC\b", r"SA\b",
        r"SOCIEDAD ANONIMA CERRADA", r"SOCIEDAD", r"EIRL",
        r"CONSORCIO", r"CORPORACION", r"INVERSIONES", r"COMERCIAL"
    ]

    # 🔹 Buscar bloque principal antes de "FACTURA"/"BOLETA"
    razon_social = []
    for idx, linea in enumerate(lineas_validas):
        if any(pat in linea for pat in ["FACTURA", "BOLETA"]):
            break  # detener búsqueda antes de la línea que contiene FACTURA/BOLETA
        if any(re.search(pat, linea) for pat in patrones_empresa):
            razon_social.append(linea)

            # Combinar con siguientes líneas si parecen parte del mismo nombre
            j = idx + 1
            while j < len(lineas_validas) and len(lineas_validas[j].split()) > 1 and not re.search(r"RUC|FECHA|BOLETA|FACTURA", lineas_validas[j]):
                if not any(re.search(pat, lineas_validas[j]) for pat in exclusiones):
                    razon_social.append(lineas_validas[j])
                j += 1
            break  # ya encontramos el bloque principal

    if razon_social:
        return " ".join(razon_social).strip()

    # 🔹 Fallback: línea antes del RUC
    if ruc:
        for idx, l in enumerate(lineas):
            if ruc in l:
                if idx > 0:
                    posible = lineas[idx - 1].strip()
                    if posible and len(posible.split()) >= 2:
                        return posible

    # 🔹 Última opción: primera línea válida
    if lineas_validas:
        return lineas_validas[0]

    return "RAZÓN SOCIAL DESCONOCIDA"

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

    # Paso 1: líneas con palabras clave
    for linea in lineas:
        if re.search(r"(TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|MONTO\s+TOTAL|TOTAL\s+FACTURA|TOTAL\s*$)", linea):
            montos = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
            for m in montos:
                normal = normalizar_monto(m)
                if normal:
                    candidatos_prioritarios.append(Decimal(normal))

    if candidatos_prioritarios:
        return f"{max(candidatos_prioritarios).quantize(Decimal('0.00'))}"

    # Paso 2: monto con prefijo S/
    m = re.search(r"S/?\s*([\d.,]+\s?[.,]\d{2})", texto_norm)
    if m:
        normal = normalizar_monto(m.group(1))
        if normal:
            return normal.strip()

    # Paso 3: monto más alto del documento
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
def procesar_datos_ocr(texto: str) -> Dict[str, Optional[str]]:
    """
    Procesa el texto OCR de un documento (boleta/factura).
    Ejecuta los detectores de RUC, Razón Social, Nº de Documento, Fecha y Total.
    Devuelve un diccionario con los datos extraídos.
    """

    if not texto:
        return {
            "ruc": None,
            "razon_social": "RAZÓN SOCIAL DESCONOCIDA",
            "numero_documento": "ND",
            "fecha": None,
            "total": "0.00",
        }

    # Debug opcional: mostrar primeras 50 líneas del OCR
    lineas = texto.splitlines()
    print("📝 OCR LINEAS CRUDAS:")
    for i, linea in enumerate(lineas[:50]):
        print(f"{i+1:02d}: {linea}")

    # --- Detectores individuales ---
    ruc = detectar_ruc(texto)
    razon_social = detectar_razon_social(texto, ruc)
    numero_doc = detectar_numero_documento(texto)
    fecha = detectar_fecha(texto)
    total = detectar_total(texto)

    # --- Retornar resultados consistentes ---
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
