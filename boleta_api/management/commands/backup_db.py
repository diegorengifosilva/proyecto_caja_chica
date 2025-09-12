import os
import datetime
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Genera un backup de la base de datos'

    def handle(self, *args, **kwargs):
        fecha = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        backup_file = os.path.join(backup_dir, f"backup_{fecha}.json")

        self.stdout.write("Iniciando backup de la base de datos...")
        os.system(f"python manage.py dumpdata --exclude auth.permission --exclude contenttypes > {backup_file}")
        self.stdout.write(f"Backup completado y guardado en {backup_file}")
