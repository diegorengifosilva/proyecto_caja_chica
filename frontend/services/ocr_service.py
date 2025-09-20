# boleta_api/services/ocr_service.py
from io import BytesIO
import base64
from typing import List, Dict, Any
from PIL import Image
import pytesseract
import os
import logging

from boleta_api.extraccion import archivo_a_imagenes, procesar_datos_ocr

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('[%(levelname)s/%(name)s] %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)


def procesar_documento_ocr(
    ruta_archivo: str,
    nombre_archivo: str,
    tipo_documento: str = "Boleta",
    concepto: str = "Solicitud de gasto",
    debug: bool = True
) -> List[Dict[str, Any]]:
    """
    Pipeline completo de OCR.
    - Convierte PDF a imágenes o extrae texto nativo.
    - Aplica OCR (pytesseract) si no hay texto embebido.
    - Usa detectores (procesar_datos_ocr).
    - Devuelve lista de resultados por página.
    """

    resultados = []

    # Leer archivo en memoria
    with open(ruta_archivo, "rb") as f:
        buffer = BytesIO(f.read())

    imagenes, textos_nativos = archivo_a_imagenes(buffer)

    if textos_nativos:
        # Caso PDF con texto embebido
        for idx, texto_crudo in enumerate(textos_nativos):
            if debug:
                print(f"\n=== Página {idx+1} ===")
                for i, linea in enumerate(texto_crudo.splitlines()[:50]):
                    linea_corta = (linea[:120] + '...') if len(linea) > 120 else linea
                    print(f"{i+1:02d}: {linea_corta}")

            datos = procesar_datos_ocr(texto_crudo, debug=debug)
            datos.update({
                "tipo_documento": tipo_documento,
                "concepto": concepto,
                "nombre_archivo": nombre_archivo,
            })

            resultados.append({
                "pagina": idx + 1,
                "texto_extraido": texto_crudo,
                "datos_detectados": datos,
                "imagen_base64": None,
            })

    else:
        # Caso PDF escaneado o imagen sin texto embebido
        for idx, img in enumerate(imagenes):
            texto_crudo = pytesseract.image_to_string(img, lang="spa")

            if debug:
                print(f"\n=== Página {idx+1} ===")
                for i, linea in enumerate(texto_crudo.splitlines()[:50]):
                    linea_corta = (linea[:120] + '...') if len(linea) > 120 else linea
                    print(f"{i+1:02d}: {linea_corta}")

            datos = procesar_datos_ocr(texto_crudo, debug=debug)
            datos.update({
                "tipo_documento": tipo_documento,
                "concepto": concepto,
                "nombre_archivo": nombre_archivo,
            })

            # Guardamos la imagen en base64
            buffer_img = BytesIO()
            img.save(buffer_img, format="PNG")
            img_b64 = base64.b64encode(buffer_img.getvalue()).decode("utf-8")

            resultados.append({
                "pagina": idx + 1,
                "texto_extraido": texto_crudo,
                "datos_detectados": datos,
                "imagen_base64": f"data:image/png;base64,{img_b64}",
            })

    # Intentar eliminar archivo temporal si existe
    try:
        os.remove(ruta_archivo)
        logger.info(f"Archivo temporal {ruta_archivo} eliminado.")
    except PermissionError:
        logger.warning(f"No se pudo borrar el archivo {ruta_archivo} por permisos en Windows.")
    except Exception as e:
        logger.error(f"Error al borrar archivo {ruta_archivo}: {e}")

    return resultados
