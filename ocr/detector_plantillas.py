# boleta_project/ocr/detector_plantillas.py

import pytesseract
from PIL import Image
from .templates.template_saga import TemplateSaga
from .templates.template_tottus import TemplateTottus

class DetectorPlantillas:
    """
    Detecta automáticamente qué plantilla OCR usar basándose en el RUC o la razón social.
    """

    # Diccionario de proveedores registrados: RUC → Plantilla
    PLANTILLAS_RUC = {
        "20123456789": TemplateSaga,   # Saga Falabella
        "20456789012": TemplateTottus  # Tottus
    }

    # Diccionario de proveedores registrados: Razón social → Plantilla
    PLANTILLAS_RAZON = {
        "SAGA FALABELLA": TemplateSaga,
        "SUPERMERCADOS TOTTUS": TemplateTottus
    }

    def __init__(self, coordenadas_ruc=None, coordenadas_razon=None):
        """
        :param coordenadas_ruc: Tupla (x, y, w, h) del área donde está el RUC.
        :param coordenadas_razon: Tupla (x, y, w, h) del área donde está la razón social.
        """
        self.coordenadas_ruc = coordenadas_ruc
        self.coordenadas_razon = coordenadas_razon

    def detectar(self, imagen_path):
        """
        Procesa la imagen y devuelve la plantilla correspondiente.
        :param imagen_path: Ruta de la imagen a procesar.
        :return: Instancia de la plantilla OCR o None si no hay coincidencia.
        """
        imagen = Image.open(imagen_path)

        # 1️⃣ Intentar detección por RUC
        if self.coordenadas_ruc:
            plantilla = self._obtener_por_ruc(imagen)
            if plantilla:
                return plantilla

        # 2️⃣ Intentar detección por Razón Social
        if self.coordenadas_razon:
            plantilla = self._obtener_por_razon(imagen)
            if plantilla:
                return plantilla

        print("⚠️ No se encontró una plantilla para este documento.")
        return None

    def _obtener_por_ruc(self, imagen):
        """Detecta plantilla basándose en el RUC."""
        x, y, w, h = self.coordenadas_ruc
        recorte_ruc = imagen.crop((x, y, x + w, y + h))
        ruc_detectado = pytesseract.image_to_string(recorte_ruc, config="--psm 6 digits").strip()

        print(f"🔍 RUC detectado: {ruc_detectado}")

        if ruc_detectado in self.PLANTILLAS_RUC:
            print(f"✅ Plantilla encontrada por RUC: {ruc_detectado}")
            return self.PLANTILLAS_RUC[ruc_detectado]()
        return None

    def _obtener_por_razon(self, imagen):
        """Detecta plantilla basándose en la razón social."""
        x, y, w, h = self.coordenadas_razon
        recorte_razon = imagen.crop((x, y, x + w, y + h))
        texto_detectado = pytesseract.image_to_string(recorte_razon, config="--psm 6").upper().strip()

        print(f"🔍 Razón social detectada: {texto_detectado}")

        for razon, clase_plantilla in self.PLANTILLAS_RAZON.items():
            if razon in texto_detectado:
                print(f"✅ Plantilla encontrada por Razón Social: {razon}")
                return clase_plantilla()
        return None


# =========================
# Funciones globales
# =========================

def obtener_plantilla_por_ruc(ruc):
    """
    Busca una plantilla por RUC exacto.
    :param ruc: Número de RUC como string.
    :return: Clase de plantilla o None.
    """
    if ruc in DetectorPlantillas.PLANTILLAS_RUC:
        print(f"✅ Plantilla encontrada por RUC: {ruc}")
        return DetectorPlantillas.PLANTILLAS_RUC[ruc]
    return None


def obtener_plantilla_por_razon_social(texto):
    """
    Busca una plantilla por coincidencia parcial de razón social.
    :param texto: Texto OCR completo del documento.
    :return: Clase de plantilla o None.
    """
    texto_mayus = texto.upper()
    for razon, clase_plantilla in DetectorPlantillas.PLANTILLAS_RAZON.items():
        if razon in texto_mayus:
            print(f"✅ Plantilla encontrada por Razón Social: {razon}")
            return clase_plantilla
    return None