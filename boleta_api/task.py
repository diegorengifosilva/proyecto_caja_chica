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
def procesar_documento_celery(self, ruta_archivo, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto", generar_imagenes=True):
    """
    Procesa un documento PDF o imagen usando Celery de forma eficiente.
    OCR solo si no hay texto nativo útil.
    Base64 de imagen opcional.
    Debug visible para primeras 50 líneas por página.
    """
    resultados = []

    try:
        with open(ruta_archivo, "rb") as f:
            archivo_bytes = f.read()

        es_pdf = ruta_archivo.lower().endswith(".pdf")

        if es_pdf:
            # Abrir PDF con pdfplumber para extraer texto nativo página por página
            with pdfplumber.open(BytesIO(archivo_bytes)) as pdf:
                for idx, page in enumerate(pdf.pages):
                    texto_crudo = page.extract_text() or ""
                    texto_crudo = texto_crudo.strip()
                    
                    # Solo si texto nativo no tiene info útil hacemos OCR
                    if not any(k in texto_crudo.upper() for k in ["RUC", "TOTAL", "FECHA"]):
                        imagen = convert_from_bytes(archivo_bytes, dpi=300, first_page=idx+1, last_page=idx+1)[0]
                        texto_crudo = pytesseract.image_to_string(imagen, lang="spa")
                        img_b64 = None
                        if generar_imagenes:
                            buffer_img = BytesIO()
                            imagen.save(buffer_img, format="PNG")
                            img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"
                    else:
                        img_b64 = None

                    # Debug: primeras 50 líneas
                    print(f"\n=== Página {idx+1} ===")
                    for i, linea in enumerate(texto_crudo.splitlines()[:50]):
                        linea_corta = (linea[:120] + '...') if len(linea) > 120 else linea
                        print(f"{i+1:02d}: {linea_corta}")

                    datos = procesar_datos_ocr(texto_crudo, debug=True)
                    datos.update({
                        "tipo_documento": tipo_documento,
                        "concepto": concepto,
                        "nombre_archivo": nombre_archivo,
                    })

                    resultados.append({
                        "pagina": idx + 1,
                        "texto_extraido": texto_crudo,
                        "datos_detectados": datos,
                        "imagen_base64": img_b64,
                    })
        else:
            # Es imagen
            imagen = Image.open(BytesIO(archivo_bytes))
            texto_crudo = pytesseract.image_to_string(imagen, lang="spa")

            # Debug primeras 50 líneas
            print("\n=== Imagen ===")
            for i, linea in enumerate(texto_crudo.splitlines()[:50]):
                linea_corta = (linea[:120] + '...') if len(linea) > 120 else linea
                print(f"{i+1:02d}: {linea_corta}")

            datos = procesar_datos_ocr(texto_crudo, debug=True)
            datos.update({
                "tipo_documento": tipo_documento,
                "concepto": concepto,
                "nombre_archivo": nombre_archivo,
            })

            img_b64 = None
            if generar_imagenes:
                buffer_img = BytesIO()
                imagen.save(buffer_img, format="PNG")
                img_b64 = f"data:image/png;base64,{base64.b64encode(buffer_img.getvalue()).decode('utf-8')}"

            resultados.append({
                "pagina": 1,
                "texto_extraido": texto_crudo,
                "datos_detectados": datos,
                "imagen_base64": img_b64,
            })

        # Intentar borrar archivo seguro
        try:
            os.remove(ruta_archivo)
        except PermissionError:
            logger.warning(f"No se pudo borrar el archivo {ruta_archivo} por permisos en Windows.")

        logger.info(f"[OCR] Documento {nombre_archivo} procesado con {len(resultados)} páginas.")
        return resultados

    except Exception as e:
        logger.error(f"[OCR] Error procesando documento {nombre_archivo}: {e}", exc_info=True)
        return {"error": f"Ocurrió un error procesando el documento: {str(e)}"}
