from boleta_api.task import procesar_documento_celery

procesar_documento_celery.delay(
    "ruta/al/archivo.pdf",
    "archivo.pdf",
    tipo_documento="Boleta",
    concepto="Solicitud de gasto"
)
print("Tarea enviada a Celery")
