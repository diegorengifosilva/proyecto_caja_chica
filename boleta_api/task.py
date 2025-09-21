# boleta_api/tasks.py
from celery import shared_task
from io import BytesIO
import base64
from .extraccion import archivo_a_imagenes, procesar_datos_ocr
from PIL import Image
import pytesseract
import os
import logging

# Configuramos logging para Celery
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(levelname)s/%(name)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


def procesar_ocr_directo(ruta_archivo, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto"):
    """
    Procesa OCR directamente sin Celery.
    Devuelve resultados listos y debug visibles.
    """
    resultados = []

    with open(ruta_archivo, "rb") as f:
        buffer = BytesIO(f.read())

    imagenes, textos_nativos = archivo_a_imagenes(buffer)

    if textos_nativos:
        for idx, texto_crudo in enumerate(textos_nativos):
            # Debug en consola (no bloquea Celery)
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
                "imagen_base64": None,
            })
    else:
        for idx, img in enumerate(imagenes):
            texto_crudo = pytesseract.image_to_string(img, lang="spa")
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

            buffer_img = BytesIO()
            img.save(buffer_img, format="PNG")
            img_b64 = base64.b64encode(buffer_img.getvalue()).decode("utf-8")

            resultados.append({
                "pagina": idx + 1,
                "texto_extraido": texto_crudo,
                "datos_detectados": datos,
                "imagen_base64": f"data:image/png;base64,{img_b64}",
            })

    return resultados


@shared_task(bind=True)
def procesar_documento_celery(self, ruta_archivo, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto", usar_celery=True):
    """
    Tarea Celery: si usar_celery=True ejecuta la parte pesada en segundo plano.
    Si usar_celery=False, solo devuelve OCR directo con debug en consola.
    """
    if not usar_celery:
        return procesar_ocr_directo(ruta_archivo, nombre_archivo, tipo_documento, concepto)

    try:
        # Ejecuta OCR directo antes de la parte pesada
        resultados = procesar_ocr_directo(ruta_archivo, nombre_archivo, tipo_documento, concepto)

        # --- Lógica pesada de Celery ---
        # Por ejemplo: almacenar imágenes en DB, enviar notificaciones, etc.
        logger.info(f"[Celery] Tarea pesada procesada para {nombre_archivo}")

        # Intentar eliminar archivo seguro para Windows
        try:
            os.remove(ruta_archivo)
        except PermissionError:
            logger.warning(f"No se pudo borrar el archivo {ruta_archivo} por permisos en Windows.")

        return resultados

    except Exception as e:
        logger.error(f"[Celery OCR] Error: {e}", exc_info=True)
        return {"error": f"Ocurrió un error en Celery OCR: {str(e)}"}
