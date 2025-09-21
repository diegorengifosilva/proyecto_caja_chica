web: gunicorn backend.wsgi:application
worker: celery -A backend worker --loglevel=info
beat: celery -A backend beat --loglevel=info
