# boleta_api/tasks.py
from celery import shared_task
from io import BytesIO
import base64
from datetime import date
from .extraccion import (
    archivo_a_imagenes,
    procesar_datos_ocr,  # <-- Usamos directamente esta función
)
from PIL import Image
import pytesseract
import os

@shared_task
def procesar_documento_celery(ruta_archivo, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto"):
    """
    Tarea Celery: procesa OCR usando procesar_datos_ocr directamente.
    """
    resultados = []

    try:
        # Abrir el archivo desde disco
        with open(ruta_archivo, "rb") as f:
            buffer = BytesIO(f.read())

        # Obtener imágenes y textos nativos (si PDF tiene texto extraíble)
        imagenes, textos_nativos = archivo_a_imagenes(buffer)

        if textos_nativos:
            # Procesar texto nativo usando procesar_datos_ocr
            for idx, texto_crudo in enumerate(textos_nativos):
                datos = procesar_datos_ocr(texto_crudo)
                datos.update({
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                })

                # 🔹 Imprimir en consola para depuración
                print(f"[Celery OCR] Página {idx + 1}:")
                print(f"Texto extraído (primeros 200 chars): {texto_crudo[:200]}")
                print(f"Datos detectados: {datos}\n")

                resultados.append({
                    "pagina": idx + 1,
                    "texto_extraido": texto_crudo,
                    "datos_detectados": datos,
                    "imagen_base64": None,
                })
        else:
            # Si solo hay imágenes, aplicar OCR con pytesseract
            for idx, img in enumerate(imagenes):
                try:
                    texto_crudo = pytesseract.image_to_string(img, lang="spa")
                except Exception:
                    texto_crudo = ""

                datos = procesar_datos_ocr(texto_crudo)
                datos.update({
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                })

                # 🔹 Imprimir en consola para depuración
                print(f"[Celery OCR] Página {idx + 1}:")
                print(f"Texto extraído (primeros 200 chars): {texto_crudo[:200]}")
                print(f"Datos detectados: {datos}\n")

                # Convertir imagen a Base64
                buffer_img = BytesIO()
                img.save(buffer_img, format="PNG")
                img_b64 = base64.b64encode(buffer_img.getvalue()).decode("utf-8")

                resultados.append({
                    "pagina": idx + 1,
                    "texto_extraido": texto_crudo,
                    "datos_detectados": datos,
                    "imagen_base64": f"data:image/png;base64,{img_b64}",
                })

        # Limpiar archivo temporal
        try:
            os.remove(ruta_archivo)
        except Exception:
            pass

        return resultados

    except Exception as e:
        print(f"[Celery OCR] Error: {e}")
        return {"error": f"Ocurrió un error en Celery OCR: {str(e)}"}
