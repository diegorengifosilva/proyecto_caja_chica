# boleta_project\backend\authentication.py

from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model

from boleta_api.models import SegUsuario

User = get_user_model()

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Sobrescribe la obtención del usuario.
        Busca el usuario según el campo `user_id` personalizado (usuario_usu).
        """
        user_id = validated_token.get("user_id")

        if not user_id:
            return None

        try:
            # Busca por usuario_usu en vez de id
            return SegUsuario.objects.using("default").get(usuario_usu=user_id)
        except SegUsuario.DoesNotExist:
            return None
