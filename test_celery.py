from boleta_api.task import procesar_documento_celery

procesar_documento_celery.delay(
    r"C:\Users\diego\OneDrive\Documentos\f1.pdf",
    "MARTINEZ.pdf",
    tipo_documento="Boleta",
    concepto="Solicitud de gasto"
)
print("Tarea enviada a Celery")
