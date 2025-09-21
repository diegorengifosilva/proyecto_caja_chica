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
def procesar_documento_celery(self, ruta_archivo, nombre_archivo, tipo_documento="Boleta", id_solicitud=None):
    """
    Tarea Celery que procesa un documento con OCR usando extraccion.py
    Devuelve un diccionario listo para frontend sin usar task_id.
    """
    try:
        logger.info(f"🔹 Iniciando OCR: {nombre_archivo} | Solicitud: {id_solicitud} | Tipo: {tipo_documento}")

        if not os.path.exists(ruta_archivo):
            msg = f"Archivo no encontrado: {ruta_archivo}"
            logger.error(f"❌ {msg}")
            return {"estado": "FAILURE", "error": msg}

        imagenes, texto_completo = archivo_a_imagenes(ruta_archivo)
        resultados = procesar_datos_ocr(texto_completo)

        logger.info(f"✅ OCR completado: {nombre_archivo} | Páginas: {len(resultados)}")

        # Borrar archivo temporal de manera segura
        try:
            os.remove(ruta_archivo)
            logger.info(f"🗑️ Archivo temporal eliminado: {ruta_archivo}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo borrar archivo temporal: {e}")

        return {"estado": "SUCCESS", "result": resultados}

    except Exception as e:
        logger.error(f"❌ Error procesando {nombre_archivo}: {e}", exc_info=True)
        return {"estado": "FAILURE", "error": str(e)}
