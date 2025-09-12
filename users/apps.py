from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

class BoletaApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'boleta_api'

    def ready(self):
        import boleta_api.signals   