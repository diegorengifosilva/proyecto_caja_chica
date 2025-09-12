# boleta_project\ocr\templates\template_tottus.py

from .base_template import BaseTemplateOCR

class TemplateTottus(BaseTemplateOCR):
    """
    Plantilla OCR para boletas/facturas de Tottus.
    Coordenadas expresadas en píxeles: (x, y, ancho, alto).
    Incluye limpieza y normalización automática de valores detectados.
    """
    
    nombre_proveedor = "Tottus"
    ruc = "20456789123"

    campos = {
        "fecha": (60, 130, 210, 40),
        "numero_documento": (420, 130, 170, 40),
        "ruc": (60, 190, 210, 40),
        "razon_social": (60, 250, 420, 40),
        "subtotal": (420, 520, 160, 40),
        "igv": (420, 570, 160, 40),
        "total": (420, 620, 160, 40),
    }

    def procesar_valor(self, campo, valor):
        """
        Normaliza el texto detectado para mejorar consistencia.
        """
        valor = valor.strip()
        
        if campo in ["subtotal", "igv", "total"]:
            valor = valor.replace("S/.", "").replace("S/", "").strip()
        elif campo == "fecha":
            valor = valor.replace(" ", "").replace("-", "/")
        elif campo == "numero_documento":
            valor = valor.replace(" ", "").upper()
        return valor
