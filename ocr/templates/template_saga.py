# boleta_project\ocr\templates\template_saga.py

from .base_template import BaseTemplateOCR

class TemplateSaga(BaseTemplateOCR):
    """
    Plantilla OCR para boletas/facturas de Saga Falabella.
    Las coordenadas se definen en píxeles: (x, y, ancho, alto).
    Si la imagen cambia de tamaño, el método `escalar_coordenadas`
    de BaseTemplateOCR ajustará las regiones automáticamente.
    """
    
    nombre_proveedor = "Saga Falabella"
    ruc = "20123456789"

    # Coordenadas originales pensadas para resolución estándar del OCR
    campos = {
        "fecha": (50, 120, 200, 40),
        "numero_documento": (400, 120, 180, 40),
        "ruc": (50, 180, 200, 40),
        "razon_social": (50, 240, 400, 40),
        "subtotal": (400, 500, 150, 40),
        "igv": (400, 550, 150, 40),
        "total": (400, 600, 150, 40),
    }

    def procesar_valor(self, campo, valor):
        """
        Normaliza y limpia el texto detectado por OCR según el campo.
        """
        valor = valor.strip()
        
        if campo in ["subtotal", "igv", "total"]:
            valor = valor.replace("S/.", "").replace("S/", "").strip()
        elif campo == "fecha":
            valor = valor.replace(" ", "").replace("-", "/")
        elif campo == "numero_documento":
            valor = valor.replace(" ", "").upper()
        return valor