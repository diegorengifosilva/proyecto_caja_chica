# boleta_api/tasks.py
from celery import shared_task
from io import BytesIO
import base64
from datetime import date
from .extraccion import (
    archivo_a_imagenes,
    detectar_numero_documento,
    detectar_fecha,
    detectar_ruc,
    detectar_razon_social,
    detectar_total,
)
from PIL import Image
import pytesseract
import os

@shared_task
def procesar_documento_celery(ruta_archivo, nombre_archivo, tipo_documento="Boleta", concepto="Solicitud de gasto"):
    """
    Tarea Celery: procesa OCR usando funciones de extraccion.py directamente
    - ruta_archivo: path al archivo temporal en disco
    - nombre_archivo: nombre original del archivo
    - tipo_documento y concepto opcionales
    """
    resultados = []

    try:
        # Abrir el archivo desde disco
        with open(ruta_archivo, "rb") as f:
            buffer = BytesIO(f.read())

        # Obtener imágenes y textos nativos (si PDF tiene texto extraíble)
        imagenes, textos_nativos = archivo_a_imagenes(buffer)

        # Función interna para debug: mostrar primeras 50 líneas
        def debug_lineas(texto_crudo, pagina_idx):
            print(f"\n📝 PÁGINA {pagina_idx + 1} - OCR LINEAS CRUDAS:")
            lineas = texto_crudo.splitlines()
            for i, linea in enumerate(lineas[:50]):
                print(f"{i+1:02d}: {linea}")

        if textos_nativos:
            # Texto extraíble directamente
            for idx, texto_crudo in enumerate(textos_nativos):
                debug_lineas(texto_crudo, idx)

                # Detectores directos
                ruc = detectar_ruc(texto_crudo)
                razon_social = detectar_razon_social(texto_crudo, ruc)
                numero_doc = detectar_numero_documento(texto_crudo)
                fecha_doc = detectar_fecha(texto_crudo)
                total_doc = detectar_total(texto_crudo)

                datos = {
                    "numero_documento": numero_doc or "ND",
                    "fecha": fecha_doc or date.today().strftime("%Y-%m-%d"),
                    "ruc": ruc or "00000000000",
                    "razon_social": razon_social or "RAZÓN SOCIAL DESCONOCIDA",
                    "total": total_doc or "0.00",
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                }

                resultados.append({
                    "pagina": idx + 1,
                    "texto_extraido": texto_crudo,
                    "datos_detectados": datos,
                    "imagen_base64": None,
                })
        else:
            # Solo imágenes -> aplicar OCR
            for idx, img in enumerate(imagenes):
                try:
                    texto_crudo = pytesseract.image_to_string(img, lang="spa")
                except Exception:
                    texto_crudo = ""

                debug_lineas(texto_crudo, idx)

                # Detectores directos
                ruc = detectar_ruc(texto_crudo)
                razon_social = detectar_razon_social(texto_crudo, ruc)
                numero_doc = detectar_numero_documento(texto_crudo)
                fecha_doc = detectar_fecha(texto_crudo)
                total_doc = detectar_total(texto_crudo)

                datos = {
                    "numero_documento": numero_doc or "ND",
                    "fecha": fecha_doc or date.today().strftime("%Y-%m-%d"),
                    "ruc": ruc or "00000000000",
                    "razon_social": razon_social or "RAZÓN SOCIAL DESCONOCIDA",
                    "total": total_doc or "0.00",
                    "tipo_documento": tipo_documento,
                    "concepto": concepto,
                    "nombre_archivo": nombre_archivo,
                }

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
        return {"error": f"Ocurrió un error en Celery OCR: {str(e)}"}
