# boleta_api/views_debug.py
from django.http import JsonResponse
import os
import platform

def tesseract_debug(request):
    tesseract_cmd = "/usr/bin/tesseract"
    tessdata_prefix = "/usr/share/tesseract-ocr/5/tessdata"

    info = {
        "platform": platform.system(),
        "tesseract_cmd": tesseract_cmd,
        "tessdata_prefix": tessdata_prefix,
        "tesseract_exists": os.path.exists(tesseract_cmd),
        "tessdata_exists": os.path.exists(tessdata_prefix),
        "list_tessdata": []
    }

    # Listar contenido de la carpeta de tessdata si existe
    if os.path.exists(tessdata_prefix):
        try:
            info["list_tessdata"] = os.listdir(tessdata_prefix)
        except Exception as e:
            info["list_tessdata_error"] = str(e)

    return JsonResponse(info)
