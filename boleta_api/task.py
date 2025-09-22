# boleta_api/tasks.py
from celery import shared_task
from io import BytesIO
import base64
from .extraccion import procesar_datos_ocr
from pdf2image import convert_from_bytes
import pdfplumber
from PIL import Image
import pytesseract
import os
import logging

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
    Optimizado para tamaño grande y OCR solo si necesario.
    Normaliza el tipo_documento para consistencia.
    """
    resultados = []

    try:
        with open(ruta_archivo, "rb") as f:
            archivo_bytes = f.read()

        es_pdf = ruta_archivo.lower().endswith(".pdf")

        if es_pdf:
            with pdfplumber.open(BytesIO(archivo_bytes)) as pdf:
                for idx, page in enumerate(pdf.pages):
                    texto_crudo = (page.extract_text() or "").strip()

                    # OCR solo si texto nativo no tiene info útil
                    if not any(k in texto_crudo.upper() for k in ["RUC", "TOTAL", "FECHA"]):
                        imagen = convert_from_bytes(archivo_bytes, dpi=150, first_page=idx+1, last_page=idx+1)[0]
                        max_width = 1200
                        if imagen.width > max_width:
                            h = int(imagen.height * max_width / imagen.width)
                            imagen = imagen.resize((max_width, h), Image.ANTIALIAS)

                        texto_crudo = pytesseract.image_to_string(imagen, lang="spa")

                        img_b64 = None
                        if generar_imagenes:
                            buffer_img = BytesIO()
                            imagen.save(buffer_img, format="PNG")
                            img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"
                    else:
                        img_b64 = None

                    # --- Detectores OCR ---
                    datos = procesar_datos_ocr(texto_crudo, debug=True)

                    # Normalizar tipo_documento
                    tipo_doc = datos.get("tipo_documento") or tipo_documento
                    datos["tipo_documento"] = tipo_doc.strip().capitalize()

                    datos.update({"concepto": concepto, "nombre_archivo": nombre_archivo})

                    resultados.append({"pagina": idx + 1, "texto_extraido": texto_crudo,
                                       "datos_detectados": datos, "imagen_base64": img_b64})

        else:
            imagen = Image.open(BytesIO(archivo_bytes))
            max_width = 1200
            if imagen.width > max_width:
                h = int(imagen.height * max_width / imagen.width)
                imagen = imagen.resize((max_width, h), Image.ANTIALIAS)

            texto_crudo = pytesseract.image_to_string(imagen, lang="spa")

            img_b64 = None
            if generar_imagenes:
                buffer_img = BytesIO()
                imagen.save(buffer_img, format="PNG")
                img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"

            datos = procesar_datos_ocr(texto_crudo, debug=True)

            tipo_doc = datos.get("tipo_documento") or tipo_documento
            datos["tipo_documento"] = tipo_doc.strip().capitalize()
            datos.update({"concepto": concepto, "nombre_archivo": nombre_archivo})

            resultados.append({"pagina": 1, "texto_extraido": texto_crudo,
                               "datos_detectados": datos, "imagen_base64": img_b64})

        # Limpiar archivo
        try:
            os.remove(ruta_archivo)
        except PermissionError:
            logger.warning(f"No se pudo borrar {ruta_archivo} por permisos.")

        logger.info(f"[OCR] Documento {nombre_archivo} procesado con {len(resultados)} páginas.")
        return resultados

    except Exception as e:
        logger.error(f"[OCR] Error procesando {nombre_archivo}: {e}", exc_info=True)
        return {"error": f"Ocurrió un error procesando el documento: {str(e)}"}
