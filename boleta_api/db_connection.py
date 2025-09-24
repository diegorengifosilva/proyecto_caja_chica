# db_connection.py
import os
import psycopg2
from urllib.parse import urlparse

def get_connection():
    """
    Retorna una nueva conexión a PostgreSQL (Render o Local),
    usando DATABASE_URL como principal y un fallback local.
    """
    DATABASE_URL = os.environ.get(
        "DATABASE_URL",
        "postgres://boleta_user:270509@localhost:5432/proyecto_db"  # fallback local
    )

    result = urlparse(DATABASE_URL)

    return psycopg2.connect(
        dbname=result.path[1:],  # quita el "/" inicial
        user=result.username,
        password=result.password,
        host=result.hostname,
        port=result.port,
        sslmode="require" if "render.com" in result.hostname else "prefer"
    )
