# boleta_project/celery.py
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Configurar el settings de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Inicializar Celery
app = Celery('boleta_api')

# Leer configuración de Django con prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Buscar automáticamente tareas en apps instaladas
app.autodiscover_tasks()

# Opcional: mostrar info cuando se lanza el worker
@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
