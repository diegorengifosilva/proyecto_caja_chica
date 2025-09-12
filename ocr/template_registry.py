# boleta_project\ocr\template_registry.py

from .templates.template_saga import TemplateSaga
from .templates.template_tottus import TemplateTottus

# Diccionario de plantillas registradas por RUC o nombre
PLANTILLAS_REGISTRADAS = {
    "20123456789": TemplateSaga,     # RUC de Saga
    "20567891234": TemplateTottus,   # RUC de Tottus
}

def obtener_plantilla_por_ruc(ruc: str):
    """
    Retorna la clase de plantilla correspondiente a un RUC.
    Si no se encuentra, devuelve None.
    """
    return PLANTILLAS_REGISTRADAS.get(ruc, None)