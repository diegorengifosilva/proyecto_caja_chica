# boleta_project/ocr/templates/base_template.py

import pytesseract
from PIL import Image
from typing import Dict, Tuple, Any


class BaseTemplateOCR:
    """
    Clase base para todas las plantillas OCR.
    Permite extraer datos desde imágenes usando coordenadas específicas para cada campo.
    """

    nombre_proveedor: str = ""  # Ej: "Saga Falabella"
    ruc: str = ""  # Ej: "20123456789"
    idioma_ocr: str = "spa"  # Idioma por defecto (español)
    campos: Dict[str, Tuple[int, int, int, int, str]] = {}
    # Estructura: {"campo": (x, y, w, h, config_tesseract)}

    def __init__(self):
        if not self.campos:
            raise ValueError(f"La plantilla {self.__class__.__name__} no tiene definidos los campos.")

    def procesar(self, imagen_path: str, devolver_recortes: bool = False) -> Dict[str, Any]:
        """
        Procesa la imagen usando las coordenadas de los campos.
        :param imagen_path: Ruta de la imagen a procesar.
        :param devolver_recortes: Si es True, incluye también las imágenes recortadas.
        :return: Diccionario con los valores extraídos y opcionalmente las imágenes recortadas.
        """
        resultados = {}
        imagen = Image.open(imagen_path)

        for campo, datos in self.campos.items():
            try:
                if len(datos) == 4:
                    x, y, w, h = datos
                    config = "--psm 6"
                else:
                    x, y, w, h, config = datos

                recorte = imagen.crop((x, y, x + w, y + h))
                texto = pytesseract.image_to_string(
                    recorte,
                    lang=self.idioma_ocr,
                    config=config
                ).strip()

                resultados[campo] = texto

                if devolver_recortes:
                    resultados[f"{campo}_recorte"] = recorte

            except Exception as e:
                resultados[campo] = f"[ERROR: {str(e)}]"

        return resultados

    @classmethod
    def obtener_info(cls) -> dict:
        """
        Devuelve información básica de la plantilla.
        """
        return {
            "nombre_proveedor": cls.nombre_proveedor,
            "ruc": cls.ruc,
            "campos": list(cls.campos.keys())
        }