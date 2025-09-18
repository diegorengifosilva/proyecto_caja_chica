# Base image con Python 3.13
FROM python:3.13-slim

# Setea variables de entorno
ENV PYTHONUNBUFFERED=1
ENV POETRY_VIRTUALENVS_CREATE=false
ENV PATH="/usr/local/bin:$PATH"

# Instalar dependencias del sistema necesarias para Django + Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libleptonica-dev \
    libtesseract-dev \
    tesseract-ocr \
    tesseract-ocr-spa \
    pkg-config \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de la app
WORKDIR /app

# Copiar archivos de requirements
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copiar todo el contenido de tu proyecto
COPY . /app/

# Exponer puerto (Render usa $PORT)
EXPOSE 8000

# Comando para correr Gunicorn
CMD ["sh", "-c", "gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
