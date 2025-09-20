# boleta_api/tasks.py
from celery import shared_task
import os
import logging
from django.conf import settings
from . import ocr_service  # <-- Nueva capa con la lógica OCR

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
    Si USE_CELERY=False (modo local): ejecuta OCR directo sin Celery.
    Si USE_CELERY=True (Render): se ejecuta como worker Celery.
    """
    try:
        if not getattr(settings, "USE_CELERY", False):
            logger.info(f"[Local] Ejecutando OCR directo para {nombre_archivo}")
            return ocr_service.procesar_ocr(
                ruta_archivo, nombre_archivo, tipo_documento, concepto
            )

        # --- Ejecución en Celery ---
        resultados = ocr_service.procesar_ocr(
            ruta_archivo, nombre_archivo, tipo_documento, concepto
        )

        logger.info(f"[Celery] OCR procesado para {nombre_archivo}")

        # Intentar limpiar archivo (manejo seguro en Windows/Linux)
        try:
            os.remove(ruta_archivo)
            logger.info(f"Archivo temporal eliminado: {ruta_archivo}")
        except PermissionError:
            logger.warning(
                f"No se pudo borrar el archivo {ruta_archivo} (permisos en Windows)."
            )

        return resultados

    except Exception as e:
        logger.error(f"[Celery OCR] Error: {e}", exc_info=True)
        return {"error": f"Ocurrió un error en Celery OCR: {str(e)}"}
