# ---------------------------
# Imagen base con Python 3.13 slim
# ---------------------------
FROM python:3.13-slim

# ---------------------------
# Variables de entorno
# ---------------------------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    PATH="/usr/local/bin:$PATH" \
    TESSDATA_PREFIX="/usr/share/tesseract-ocr/5/tessdata"

# ---------------------------
# Instalar dependencias del sistema y Tesseract/OpenCV
# ---------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libleptonica-dev \
    libtesseract-dev \
    tesseract-ocr \
    tesseract-ocr-spa \
    pkg-config \
    poppler-utils \
    libgl1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verificar Tesseract
RUN which tesseract && tesseract --version

# ---------------------------
# Directorio de la app
# ---------------------------
WORKDIR /app

# ---------------------------
# Copiar requirements y instalar
# ---------------------------
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------
# Copiar proyecto completo
# ---------------------------
COPY . /app/

# ---------------------------
# Exponer puerto y comando
# ---------------------------
EXPOSE 8000
CMD ["sh", "-c", "gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
