# boleta_project\ocr\templates\__init__.py

"""
Módulo de inicialización de plantillas OCR.
Aquí registramos todas las plantillas disponibles en el sistema.
"""

from .template_saga import TemplateSaga
from .template_tottus import TemplateTottus

# Diccionario que asocia el nombre o RUC del proveedor con su clase plantilla
PLANTILLAS_OCR = {
    "Saga Falabella": TemplateSaga,
    "Tottus": TemplateTottus,
}

def obtener_plantilla(proveedor: str):
    """
    Retorna la clase plantilla OCR correspondiente al proveedor.
    :param proveedor: Nombre o identificador del proveedor.
    :return: Clase plantilla OCR o None si no existe.
    """
    return PLANTILLAS_OCR.get(proveedor)
