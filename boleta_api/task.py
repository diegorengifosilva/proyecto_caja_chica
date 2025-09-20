# boleta_api/tasks.py
from celery import shared_task
import os
import logging
from django.conf import settings
from .extraccion import archivo_a_imagenes, procesar_datos_ocr

# Configuración de logging para Celery
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(levelname)s/%(name)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


@shared_task(bind=True)
def procesar_documento_celery(
    self,
    ruta_archivo,
    nombre_archivo,
    tipo_documento="Boleta",
    concepto="Solicitud de gasto",
):
    """
    Tarea Celery que procesa un documento con OCR.
    - Si USE_CELERY=False (modo local): ejecuta OCR directo sin Celery.
    - Si USE_CELERY=True (Render/Producción): se ejecuta como worker Celery.
    """
    try:
        logger.info(
            f"🔹 Iniciando procesamiento OCR para {nombre_archivo} | "
            f"Modo: {'Celery' if getattr(settings, 'USE_CELERY', False) else 'Local directo'}"
        )

        # OCR directo (modo local sin Celery)
        if not getattr(settings, "USE_CELERY", False):
            imagenes, texto_completo = archivo_a_imagenes(ruta_archivo)
            resultados = procesar_datos_ocr(texto_completo)
            logger.info(f"✅ OCR directo finalizado para {nombre_archivo}")
            return resultados

        # --- Ejecución en Celery (Render/Producción) ---
        imagenes, texto_completo = archivo_a_imagenes(ruta_archivo)
        resultados = procesar_datos_ocr(texto_completo)

        logger.info(f"✅ [Celery] OCR procesado para {nombre_archivo}")

        # Intentar limpiar archivo temporal
        try:
            os.remove(ruta_archivo)
            logger.info(f"🗑️ Archivo temporal eliminado: {ruta_archivo}")
        except PermissionError:
            logger.warning(
                f"⚠️ No se pudo borrar el archivo {ruta_archivo} (permisos en Windows)."
            )

        return resultados

    except Exception as e:
        logger.error(f"❌ [OCR] Error procesando {nombre_archivo}: {e}", exc_info=True)
        return {"error": f"Ocurrió un error en OCR: {str(e)}"}
