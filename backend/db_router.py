# boleta_project/backend/db_router.py
class VCRouter:
    """
    Fuerza a que todas las operaciones sean de solo lectura.
    Compatible con configuración de una sola base de datos ('default').
    """

    def db_for_read(self, model, **hints):
        return "default"

    def db_for_write(self, model, **hints):
        # Bloquea cualquier intento de escritura
        return None

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Evita migraciones sobre la DB
        return False
