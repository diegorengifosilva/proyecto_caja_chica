# boleta_api/tasks.py
from celery import shared_task
from io import BytesIO
import base64
from datetime import date
from decimal import Decimal, InvalidOperation
from .extraccion import archivo_a_imagenes, procesar_datos_ocr

@shared_task
def procesar_documento_celery(archivo_bytes, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto"):
    """
    Tarea Celery: procesa OCR usando funciones de extraccion.py
    """
    from PIL import Image
    resultados = []

    try:
        buffer = BytesIO(archivo_bytes)
        imagenes, textos_nativos = archivo_a_imagenes(buffer)

        if textos_nativos:
            for idx, texto_crudo in enumerate(textos_nativos):
                datos = procesar_datos_ocr(texto_crudo)
                datos.update({
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                    "numero_documento": datos.get("numero_documento") or "ND",
                    "fecha": datos.get("fecha") or date.today().strftime("%Y-%m-%d"),
                    "total": datos.get("total") or "0.00",
                    "razon_social": datos.get("razon_social") or "RAZÓN SOCIAL DESCONOCIDA",
                    "ruc": datos.get("ruc") or "00000000000",
                })

                resultados.append({
                    "pagina": idx + 1,
                    "texto_extraido": texto_crudo,
                    "datos_detectados": datos,
                    "imagen_base64": None,
                })
        else:
            for idx, img in enumerate(imagenes):
                try:
                    import pytesseract
                    texto_crudo = pytesseract.image_to_string(img, lang="spa")
                    datos = procesar_datos_ocr(texto_crudo)
                except Exception:
                    texto_crudo, datos = "", {}

                datos.update({
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                    "numero_documento": datos.get("numero_documento") or "ND",
                    "fecha": datos.get("fecha") or date.today().strftime("%Y-%m-%d"),
                    "total": datos.get("total") or "0.00",
                    "razon_social": datos.get("razon_social") or "RAZÓN SOCIAL DESCONOCIDA",
                    "ruc": datos.get("ruc") or "00000000000",
                })

                buffer_img = BytesIO()
                img.save(buffer_img, format="PNG")
                img_b64 = base64.b64encode(buffer_img.getvalue()).decode("utf-8")

                resultados.append({
                    "pagina": idx + 1,
                    "texto_extraido": texto_crudo,
                    "datos_detectados": datos,
                    "imagen_base64": f"data:image/png;base64,{img_b64}",
                })

        return resultados

    except Exception as e:
        return {"error": f"Ocurrió un error en Celery OCR: {str(e)}"}
