from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(request=self.context.get("request"), email=email, password=password)
            if not user:
                raise serializers.ValidationError("Credenciales incorrectas", code="authorization")
        else:
            raise serializers.ValidationError("Debe incluir email y contraseña")

        data = super().validate(attrs)

        if user and hasattr(user, "last_login"):
            update_last_login(None, user)

        return data