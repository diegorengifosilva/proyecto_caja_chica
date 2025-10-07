from celery import shared_task
from io import BytesIO
import base64
import pytesseract
from .extraccion import procesar_datos_ocr, extraer_datos_qr
from pdf2image import convert_from_bytes
import pdfplumber
from PIL import Image
import os
import logging
from concurrent.futures import ThreadPoolExecutor
import multiprocessing
import tempfile
from PyPDF2 import PdfReader, PdfWriter

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(levelname)s/%(name)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

@shared_task(bind=True)
def procesar_documento_celery(self, ruta_archivo, nombre_archivo,
                               tipo_documento="Boleta", concepto="Solicitud de gasto",
                               generar_imagenes=True):
    """
    Procesa PDF o imagen de manera eficiente.
    - Primero intenta leer QR (RUC, total, fecha).
    - Luego aplica OCR y combina resultados.
    Devuelve resultados directamente desde Celery worker.
    """
    resultados = []

    # Compatibilidad Pillow 10+
    try:
        resample_method = Image.Resampling.LANCZOS
    except AttributeError:
        resample_method = Image.ANTIALIAS

    try:
        with open(ruta_archivo, "rb") as f:
            archivo_bytes = f.read()

        es_pdf = ruta_archivo.lower().endswith(".pdf")

        if es_pdf:
            # --- PDF multipágina con procesamiento paralelo ---
            with pdfplumber.open(BytesIO(archivo_bytes)) as pdf:
                paginas = list(pdf.pages)

                def procesar_pagina(idx_pag):
                    page = paginas[idx_pag]
                    texto_crudo = (page.extract_text() or "").strip()
                    img_b64 = None
                    imagen = None

                    # DPI dinámico
                    dpi_pag = 100 if texto_crudo and len(texto_crudo) > 50 else 220
                    if not any(k in texto_crudo.upper() for k in ["RUC", "TOTAL", "FECHA"]):
                        imagen = convert_from_bytes(
                            archivo_bytes, dpi=dpi_pag, first_page=idx_pag+1, last_page=idx_pag+1
                        )[0]

                        if imagen.width > 1200:
                            h = int(imagen.height * 1200 / imagen.width)
                            imagen = imagen.resize((1200, h), resample_method)

                        if imagen.width > imagen.height:
                            try:
                                osd = pytesseract.image_to_osd(imagen)
                                rotation = int([line for line in osd.split("\n") if "Rotate:" in line][0].split(":")[1].strip())
                                if rotation != 0:
                                    imagen = imagen.rotate(rotation, expand=True)
                            except:
                                pass

                        texto_crudo = pytesseract.image_to_string(imagen, lang="spa")

                        if generar_imagenes:
                            buffer_img = BytesIO()
                            imagen.save(buffer_img, format="PNG")
                            img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"

                    # --- OCR detectores ---
                    datos = procesar_datos_ocr(texto_crudo, debug=False)

                    # --- QR detectores (si hay imagen disponible) ---
                    if imagen is not None:
                        datos_qr = extraer_datos_qr(imagen, debug=True)
                        if any(datos_qr.values()):
                            logger.info(f"[QR] Página {idx_pag+1}: QR detectado {datos_qr}")
                            # Merge: QR tiene prioridad
                            datos.update({k: v for k, v in datos_qr.items() if v})

                    datos["tipo_documento"] = (datos.get("tipo_documento") or tipo_documento).capitalize()
                    datos.update({"concepto": concepto, "nombre_archivo": nombre_archivo})

                    return {
                        "pagina": idx_pag + 1,
                        "texto_extraido": texto_crudo,
                        "datos_detectados": datos,
                        "imagen_base64": img_b64
                    }

                max_threads = min(len(paginas), multiprocessing.cpu_count() * 2)
                with ThreadPoolExecutor(max_workers=max_threads) as executor:
                    resultados = list(executor.map(procesar_pagina, range(len(paginas))))

        else:
            # --- Imagen (JPG, PNG, etc.) ---
            imagen = Image.open(BytesIO(archivo_bytes))

            # Forzar modo RGB
            if imagen.mode != "RGB":
                imagen = imagen.convert("RGB")

            # Redimensionar si es muy ancha
            if imagen.width > 1200:
                h = int(imagen.height * 1200 / imagen.width)
                imagen = imagen.resize((1200, h), resample_method)

            # Asegurar orientación vertical
            if imagen.width > imagen.height:
                try:
                    osd = pytesseract.image_to_osd(imagen)
                    rotation = int([line for line in osd.split("\n") if "Rotate:" in line][0].split(":")[1].strip())
                    if rotation != 0:
                        imagen = imagen.rotate(rotation, expand=True)
                except:
                    pass

            # --- QR detectores primero ---
            datos_qr = extraer_datos_qr(imagen, debug=True)

            # --- OCR de la imagen ---
            texto_crudo = pytesseract.image_to_string(imagen, lang="spa")
            img_b64 = None
            if generar_imagenes:
                buffer_img = BytesIO()
                imagen.save(buffer_img, format="PNG")
                img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"

            # --- OCR detectores ---
            datos = procesar_datos_ocr(texto_crudo, debug=False)

            # Merge QR con prioridad
            if any(datos_qr.values()):
                logger.info(f"[QR] Imagen única: QR detectado {datos_qr}")
                datos.update({k: v for k, v in datos_qr.items() if v})

            datos["tipo_documento"] = (datos.get("tipo_documento") or tipo_documento).capitalize()
            datos.update({"concepto": concepto, "nombre_archivo": nombre_archivo})

            resultados.append({
                "pagina": 1,
                "texto_extraido": texto_crudo,
                "datos_detectados": datos,
                "imagen_base64": img_b64
            })

        # Limpiar archivo temporal
        try:
            os.remove(ruta_archivo)
        except PermissionError:
            logger.warning(f"No se pudo borrar {ruta_archivo} por permisos.")

        logger.info(f"[OCR+QR] Documento {nombre_archivo} procesado con {len(resultados)} páginas.")
        return resultados

    except Exception as e:
        logger.error(f"[OCR] Error procesando {nombre_archivo}: {e}", exc_info=True)
        return {"error": f"Ocurrió un error procesando el documento: {str(e)}"}


# -----------------------------------------------------------
# Helper: Dividir PDF multipágina en archivos temporales
# -----------------------------------------------------------
def dividir_paginas_pdf(ruta_pdf):
    """
    Divide un PDF multipágina en archivos temporales (uno por página).
    Devuelve lista de rutas.
    """
    try:
        reader = PdfReader(ruta_pdf)
        rutas_paginas = []

        for i, page in enumerate(reader.pages):
            writer = PdfWriter()
            writer.add_page(page)

            fd, ruta_temp = tempfile.mkstemp(
                suffix=f"_p{i+1}.pdf",
                dir=os.path.dirname(ruta_pdf)
            )
            os.close(fd)
            with open(ruta_temp, "wb") as f:
                writer.write(f)

            rutas_paginas.append(ruta_temp)

        return rutas_paginas

    except Exception as e:
        logger.error(f"[OCR Utils] Error dividiendo PDF {ruta_pdf}: {e}", exc_info=True)
        return []
