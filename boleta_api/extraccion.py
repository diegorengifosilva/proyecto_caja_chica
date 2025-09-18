# boleta_api/extraccion.py
import re
import requests
import unicodedata
import pytesseract
from typing import Optional, Dict, List, Union
from datetime import datetime, date, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError
from pdf2image import convert_from_bytes
from pdf2image.exceptions import PDFInfoNotInstalledError, PDFPageCountError
from PIL import Image, UnidentifiedImageError


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
    Detecta el número de documento (boleta o factura) en el texto OCR.
    Ejemplos: E001-97, E001-447
    """
    if not texto:
        return "ND"

    # --- Normalizar OCR ---
    texto_norm = texto.upper().replace("O", "0").replace("I", "1").replace("E", "6").replace(" ", "")

    # --- Patrón principal: serie-correlativo ---
    # Serie: 1 letra (B o F) + 2-3 dígitos
    # Correlativo: 2-8 dígitos
    patron = r"([BF]\d{2,3})[-]?(\d{2,8})"

    # Buscar primero líneas que están justo debajo de RUC
    lineas = texto.splitlines()
    ruc_idx = None
    ruc_match = re.search(r"\b\d{11}\b", texto)
    if ruc_match:
        for i, l in enumerate(lineas):
            if ruc_match.group(0) in l:
                ruc_idx = i
                break

    posibles = []
    for i, linea in enumerate(lineas):
        # Dar prioridad a línea inmediatamente debajo del RUC
        prioridad = ruc_idx is not None and i == ruc_idx + 1
        match = re.search(patron, linea.replace(" ", ""))
        if match:
            serie, correlativo = match.groups()
            numero = f"{serie}-{correlativo}"
            if prioridad:
                return numero  # Retornar inmediatamente si está justo debajo del RUC
            posibles.append(numero)

    # Si no encontramos debajo del RUC, retornamos el primer match
    if posibles:
        return posibles[0]

    return "ND"


def detectar_fecha(texto: str) -> Optional[str]:
    """
    Detecta la fecha de emisión en boletas o facturas electrónicas.
    Normaliza a YYYY-MM-DD.
    Prioriza:
      1. FECHA DE EMISION
      2. FECHA
    Ignora FECHA DE VENCIMIENTO.
    """

    if not texto:
        return None

    texto_mayus = texto.upper()

    # Correcciones OCR típicas
    reemplazos = {
        "E/": "11/",
        "O/": "01/",
        "I/": "1/",
        "l/": "1/",
        "S/": "5/",
    }
    for k, v in reemplazos.items():
        texto_mayus = texto_mayus.replace(k, v)

    lineas = texto_mayus.splitlines()
    posibles = []

    for linea in lineas:
        if "VENCIMIENTO" in linea:
            continue  # ignorar fecha de vencimiento
        if "FECHA DE EMISION" in linea or "FECHA EMISION" in linea:
            posibles.append(linea)
        elif "FECHA" in linea:
            posibles.append(linea)

    if not posibles:
        return None

    # Buscar patrones de fecha en las líneas candidatas
    patrones = [
        r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        r"\d{4}[/-]\d{1,2}[/-]\d{1,2}",
        r"\d{1,2}\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{2,4}",
        r"(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)[A-Z]*\s+\d{1,2},?\s+\d{2,4}"
    ]

    fechas_validas = []
    meses = {
        "ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
        "JUL": 7, "AGO": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12
    }

    for linea in posibles:
        for patron in patrones:
            for f in re.findall(patron, linea):
                f = f.replace("-", "/").strip()
                fecha_obj = None
                try:
                    # dd/mm/yyyy
                    partes = f.split("/")
                    if len(partes) == 3:
                        d, m, y = partes
                        if len(d) == 1: d = "0"+d
                        if len(m) == 1: m = "0"+m
                        if len(y) == 2: y = "20"+y
                        fecha_obj = datetime.strptime(f"{d}/{m}/{y}", "%d/%m/%Y")
                except:
                    pass

                if not fecha_obj:
                    # fecha con mes texto
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
                    # solo fechas razonables (últimos 5 años)
                    if datetime.now() - timedelta(days=5*365) <= fecha_obj <= datetime.now():
                        fechas_validas.append(fecha_obj)

    if not fechas_validas:
        return None

    # Retornar la más reciente (o única)
    mejor_fecha = max(fechas_validas)
    return mejor_fecha.strftime("%Y-%m-%d")


def detectar_ruc(texto: str) -> Optional[str]:
    """
    Detecta un RUC válido de 11 dígitos en boletas o facturas electrónicas.
    Prioriza líneas con 'RUC' y evita RUC bloqueado.
    """
    if not texto:
        return None

    # RUC que no debe ser detectado
    RUC_EXCLUIDOS = {"20508558997"}

    # Normalización OCR básica
    texto = texto.upper()
    texto = texto.replace("O", "0").replace("I", "1").replace("L", "1")

    lineas = texto.splitlines()
    # Revisar solo primeras 15 líneas
    lineas = lineas[:15]

    posibles_ruc = []
    for linea in lineas:
        if "RUC" in linea:
            # Buscar primer número de 11 dígitos
            rucs = re.findall(r"\b\d{11}\b", linea)
            for r in rucs:
                if r not in RUC_EXCLUIDOS:
                    posibles_ruc.append(r)

    if posibles_ruc:
        return posibles_ruc[0]  # retornar el primero que aparezca

    # Fallback: cualquier RUC en las primeras 15 líneas
    for linea in lineas:
        rucs = re.findall(r"\b\d{11}\b", linea)
        for r in rucs:
            if r not in RUC_EXCLUIDOS:
                return r

    return None


def detectar_razon_social(texto: str, ruc: Optional[str] = None) -> Optional[str]:
    """
    Detecta la razón social de una boleta o factura electrónica.
    Intenta priorizar empresas, luego personas naturales.
    """
    if not texto:
        return "RAZÓN SOCIAL DESCONOCIDA"

    # Normalización básica OCR
    texto_norm = texto.upper()
    texto_norm = re.sub(r"\s{2,}", " ", texto_norm)

    reemplazos = {
        "5A": "S.A",
        "$.A.C": "S.A.C",
        "S , A": "S.A",
        "S . A . C": "S.A.C",
        "S . A": "S.A",
        "3.A.C.": "S.A.C.",
        "SA.": "S.A.",
        "SAC.": "S.A.C",
        "RETALE": "RETAIL",
    }
    for k, v in reemplazos.items():
        texto_norm = texto_norm.replace(k, v)

    # Separar líneas y limpiar
    lineas = [l.strip(" ,.-") for l in texto_norm.splitlines() if l.strip()]

    # Excluir líneas con palabras de dirección o etiquetas
    lineas_validas = [
        l for l in lineas[:15]  # primeras 15 líneas
        if not re.match(r"^(CAL\.|AV\.|JR\.|PSJE\.|RUC\.|BOLETA|FACTURA)", l)
    ]

    # Buscar patrones de empresa
    patrones_empresa = [
        r".*\bS\.?\s*A\.?\s*C\.?\b.*",  # S.A.C
        r".*\bS\.?\s*A\.?\b.*",         # S.A
        r".*\bSAC\b.*",                  # SAC
        r".*\bSA\b.*",                   # SA
        r".*\bSOCIEDAD ANONIMA CERRADA\b.*",
        r".*\bEIRL\b.*",                 # Empresa Individual de Responsabilidad Limitada
    ]

    for linea in lineas_validas:
        for patron in patrones_empresa:
            if re.search(patron, linea):
                return linea.strip()

    # Fallback persona natural: línea antes del RUC
    if ruc:
        for idx, l in enumerate(lineas):
            if ruc in l:
                if idx > 0:
                    posible = lineas[idx - 1].strip()
                    if posible:
                        return posible

    # Última opción: primera línea válida
    if lineas_validas:
        return lineas_validas[0]

    return "RAZÓN SOCIAL DESCONOCIDA"


def detectar_total(texto: str) -> str:
    """
    Detecta el importe total del OCR en boletas/facturas.
    Estrategia jerárquica:
      1) Buscar montos en líneas con palabras clave (TOTAL, IMPORTE TOTAL, TOTAL A PAGAR, MONTO TOTAL).
      2) Buscar montos con prefijo S/.
      3) Fallback: el monto más alto de todo el texto.
    Retorna '0.00' si no se encuentra nada.
    """
    if not texto:
        return "0.00"

    texto_norm = texto.upper()

    # Correcciones OCR para S/
    texto_norm = texto_norm.replace("S . /", "S/").replace("S-/", "S/").replace("S.", "S/")

    # 🔹 Paso 1: Escanear línea por línea con palabras clave
    lineas = texto_norm.splitlines()
    candidatos_prioritarios = []
    for linea in lineas:
        if re.search(r"(TOTAL\s+A\s+PAGAR|IMPORTE\s+TOTAL|MONTO\s+TOTAL|TOTAL\s+FACTURA|TOTAL\s*$)", linea):
            montos = re.findall(r"\d{1,3}(?:[.,]\d{3})*[.,]\d{2}", linea)
            for m in montos:
                normal = normalizar_monto(m)
                if normal:
                    candidatos_prioritarios.append(float(normal))

    if candidatos_prioritarios:
        return f"{max(candidatos_prioritarios):.2f}"

    # 🔹 Paso 2: Buscar montos con prefijo S/
    m = re.search(r"S/?\s*([\d.,]+\s?[.,]\d{2})", texto_norm)
    if m:
        normal = normalizar_monto(m.group(1))
        if normal:
            return normal.strip()

    # 🔹 Paso 3: Fallback global – el mayor número decimal del texto
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

    # 🔹 Fallback final
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

# ===================#
# CONVERSION DE PDFs #
# ===================#
def archivo_a_imagenes(archivo) -> List[Image.Image]:
    """
    Convierte un archivo PDF o imagen a una lista de objetos PIL.Image.
    
    Args:
        archivo: archivo tipo file-like object (PDF o imagen).

    Returns:
        List[Image.Image]: Lista de imágenes PIL. Lista vacía si falla la conversión.
    """
    imagenes: List[Image.Image] = []

    try:
        archivo.seek(0)  # Reinicia el puntero del archivo
        if archivo.name.lower().endswith(".pdf"):
            try:
                pdf_bytes = archivo.read()
                imagenes = convert_from_bytes(pdf_bytes, dpi=300)
            except PDFInfoNotInstalledError:
                print("❌ Poppler no está instalado o no se encuentra en el PATH.")
            except PDFPageCountError:
                print(f"❌ PDF corrupto o ilegible: {archivo.name}")
            except Exception as e:
                print(f"❌ Error convirtiendo PDF a imágenes ({archivo.name}): {e}")
        else:
            try:
                img = Image.open(archivo)
                img.load()  # Asegura que la imagen esté completamente cargada
                imagenes = [img]
            except UnidentifiedImageError:
                print(f"❌ Archivo no es una imagen válida: {archivo.name}")
            except Exception as e:
                print(f"❌ Error abriendo imagen ({archivo.name}): {e}")
    except Exception as e:
        print(f"❌ Error procesando el archivo ({archivo.name}): {e}")

    return imagenes

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
