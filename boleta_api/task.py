# boleta_api/tasks.py
from celery import shared_task
import os
import logging
from .extraccion import archivo_a_imagenes, procesar_datos_ocr

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(levelname)s/%(name)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


@shared_task(bind=True)
def procesar_documento_celery(self, ruta_archivo, nombre_archivo, tipo_documento="Boleta"):
    """
    Tarea Celery que procesa un documento con OCR usando extraccion.py
    """
    try:
        logger.info(f"🔹 [Celery] Procesando OCR para: {nombre_archivo}")

        # Extraer imágenes y texto
        imagenes, texto_completo = archivo_a_imagenes(ruta_archivo)

        # Procesar texto con los detectores
        resultados = procesar_datos_ocr(texto_completo)

        logger.info(f"✅ [Celery] OCR completado para {nombre_archivo}")

        # Limpieza del archivo temporal
        try:
            os.remove(ruta_archivo)
            logger.info(f"🗑️ Archivo temporal eliminado: {ruta_archivo}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo borrar el archivo {ruta_archivo}: {e}")

        return resultados

    except Exception as e:
        logger.error(f"❌ [Celery OCR] Error procesando {nombre_archivo}: {e}", exc_info=True)
        return {"error": f"Ocurrió un error en OCR: {str(e)}"}
