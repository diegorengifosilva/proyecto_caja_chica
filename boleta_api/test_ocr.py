# boleta_project/boleta_api/tests/test_ocr.py

from django.test import TestCase
from ocr.ocr_utils import (
    extraer_datos_estructurados,
    validar_ruc,
    validar_fecha,
    calcular_total
)

class OCRUtilsTests(TestCase):

    def test_validar_ruc(self):
        # RUC válido (11 dígitos y pasa validación)
        self.assertTrue(validar_ruc("20123456789"))
        # RUC inválido (menos dígitos)
        self.assertFalse(validar_ruc("123456"))
        # RUC inválido (no numérico)
        self.assertFalse(validar_ruc("20ABC456789"))

    def test_validar_fecha(self):
        # Fecha válida en formato dd/mm/yyyy
        self.assertTrue(validar_fecha("07/08/2025"))
        # Fecha válida en formato yyyy-mm-dd
        self.assertTrue(validar_fecha("2025-08-07"))
        # Fecha inválida
        self.assertFalse(validar_fecha("32/13/2025"))

    def test_calcular_total(self):
        subtotal = 100
        igv = 18
        total = calcular_total(subtotal, igv)
        self.assertEqual(total, 118.0)

    def test_extraer_datos_estructurados(self):
        texto_mock = """
        RUC: 20123456789
        Fecha: 07/08/2025
        Subtotal: 100.00
        IGV: 18.00
        Total: 118.00
        """
        datos = extraer_datos_estructurados(texto_mock)
        self.assertEqual(datos["ruc"], "20123456789")
        self.assertEqual(datos["fecha"], "07/08/2025")
        self.assertAlmostEqual(datos["subtotal"], 100.00)
        self.assertAlmostEqual(datos["igv"], 18.00)
        self.assertAlmostEqual(datos["total"], 118.00)