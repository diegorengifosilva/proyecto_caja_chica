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
    TESSDATA_PREFIX="/usr/share/tesseract-ocr/5/tessdata" \
    DJANGO_SETTINGS_MODULE=backend.settings \
    POPPLER_PATH="/usr/bin"

# ---------------------------
# Instalar dependencias del sistema
# ---------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libleptonica-dev \
    libtesseract-dev \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    pkg-config \
    poppler-utils \
    libgl1 \
    libsm6 \
    libxext6 \
    git \
    wget \
    curl \
    poppler-data \
    locales \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configurar locales
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Verificar Tesseract y Poppler
RUN which tesseract && tesseract --version
RUN which pdftoppm && pdftoppm -v

# ---------------------------
# Directorio de la app
# ---------------------------
WORKDIR /app
RUN mkdir -p /app/media /app/staticfiles && chmod -R 777 /app/media /app/staticfiles

# ---------------------------
# Instalar Python requirements
# ---------------------------
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------------------------
# Copiar proyecto completo
# ---------------------------
COPY . /app/

# ---------------------------
# Exponer puerto (Render usará $PORT)
# ---------------------------
EXPOSE 8000

# ---------------------------
# Comando Gunicorn estable para Render
# ---------------------------
CMD exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --timeout 120 \
    --log-level info
