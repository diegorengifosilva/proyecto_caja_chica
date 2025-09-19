# boleta_api/serializers.py

from rest_framework import serializers
from django.db import transaction, models
from django.contrib.auth import get_user_model
from django.db.models import Sum
import datetime
import uuid
from .models import (
    CustomUser,
    DocumentoGasto,
    CorreccionOCR,
    CajaDiaria,
    Solicitud,
    ArqueoCaja,
    ArqueoMovimiento,
    ArqueoAdjunto,
    Notificacion,
    EstadoCaja,
    Liquidacion,
    Actividad,
    GuiaItem,
    GuiaSalida,
    SolicitudGastoEstadoHistorial
)
from django.contrib.auth import get_user_model
from django.utils.timezone import localtime
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.hashers import make_password
from decimal import Decimal, InvalidOperation

User = get_user_model()

#========================================================================================
#==================#
# REGISTER Y LOGIN #
#==================#
# Serializador de registro
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = (
            'email',
            'password',
            'nombre',
            'apellido',
            'empresa',
            'edad',
            'pais',
            'rol',
            'area'
        )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está registrado.")
        return value

    def validate_edad(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La edad debe ser mayor a 0.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


# Serializador login con email
class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError("Correo y contraseña son obligatorios.")

        attrs["username"] = email  # SimpleJWT requiere username

        try:
            data = super().validate(attrs)
        except Exception as e:
            raise serializers.ValidationError(f"Error interno de login: {str(e)}")

        user = self.user
        data["user"] = {
            "id": user.id,
            "email": user.email,
            "nombre": getattr(user, "nombre", ""),
            "apellido": getattr(user, "apellido", ""),
            "rol": getattr(user, "rol", ""),
            "area": getattr(user, "area", None),
        }

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["nombre_completo"] = f"{getattr(user, 'nombre', '')} {getattr(user, 'apellido', '')}"
        token["area"] = getattr(user, "area", None)
        return token

#========================================================================================

##====================##
## PANTALLA PRINCIPAL ##
##====================##

#========================================================================================

##==============##
## PROGRAMACIÓN ##
##==============##

#========================================================================================

##====================##
## SOLICITUD DE GASTO ##
##====================##
# Serializer principal
class SolicitudGastoSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.SerializerMethodField(read_only=True)
    solicitante_area = serializers.SerializerMethodField(read_only=True)
    destinatario_nombre = serializers.SerializerMethodField(read_only=True)
    solicitante = serializers.PrimaryKeyRelatedField(read_only=True)
    destinatario_id = serializers.PrimaryKeyRelatedField(
        source="destinatario",
        queryset=CustomUser.objects.all(),
        required=False,
        allow_null=True
    )
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Solicitud
        fields = '__all__'
        read_only_fields = ['solicitante', 'estado', 'creado', 'numero_solicitud', 'codigo']

    # ---------- Métodos extra ----------
    def get_solicitante_nombre(self, obj):
        try:
            return f"{obj.solicitante.nombre} {obj.solicitante.apellido}" if obj.solicitante else None
        except AttributeError:
            return None

    def get_solicitante_area(self, obj):
        try:
            return obj.solicitante.area.nombre if obj.solicitante and obj.solicitante.area else None
        except AttributeError:
            return None

    def get_destinatario_nombre(self, obj):
        try:
            return f"{obj.destinatario.nombre} {obj.destinatario.apellido}" if obj.destinatario else ""
        except AttributeError:
            return ""

   # ---------- Crear ----------
    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["solicitante"] = request.user

        # Asignar destinatario si viene
        destinatario = validated_data.pop("destinatario_id", None)
        if destinatario:
            validated_data["destinatario"] = destinatario

        if not validated_data.get("tipo_solicitud"):
            validated_data["tipo_solicitud"] = "Otros Gastos"

        if not validated_data.get('numero_solicitud'):
            hoy = datetime.date.today()
            anio = hoy.year
            ultimo = Solicitud.objects.filter(numero_solicitud__startswith=f"SG-{anio}").order_by("-id").first()
            nuevo_num = int(ultimo.numero_solicitud.split("-")[-1]) + 1 if ultimo else 1
            validated_data['numero_solicitud'] = f"SG-{anio}-{nuevo_num:04d}"

        if not validated_data.get('codigo'):
            validated_data['codigo'] = str(uuid.uuid4()).split("-")[0].upper()

        validated_data['estado'] = validated_data.get('estado', 'Pendiente de Envío')

        return super().create(validated_data)

# Serializer simplificado
class SolicitudGastoSimpleSerializer(serializers.ModelSerializer):
    liquidacion_numero_operacion = serializers.SerializerMethodField()
    solicitante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Solicitud
        fields = [
            'id', 'numero_solicitud',
            'total_soles', 'total_dolares',
            'liquidacion_numero_operacion',
            'solicitante_nombre', 'estado'
        ]
        read_only_fields = ['numero_solicitud', 'estado']

    def get_liquidacion_numero_operacion(self, obj):
        return getattr(obj.liquidacion, 'numero_operacion', None) if obj.liquidacion else None

    def get_solicitante_nombre(self, obj):
        if obj.solicitante:
            nombre = getattr(obj.solicitante, 'nombre', '')
            apellido = getattr(obj.solicitante, 'apellido', '')
            return f"{nombre} {apellido}".strip()
        return None

# ========== Serializer para la tabla ==========
class MisSolicitudesTablaSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Solicitud
        fields = [
            "id",
            "numero_solicitud",
            "fecha",
            "solicitante_nombre",
            "destinatario",
            "tipo_solicitud",
            "area",
            "estado",
            "total_soles",
            "total_dolares",
            "fecha_transferencia",
            "fecha_liquidacion",
            "banco",
            "numero_cuenta",
            "concepto_gasto",
            "observacion",
        ]

    def get_solicitante_nombre(self, obj):
        return obj.solicitante.get_full_name() or obj.solicitante.username

# ========== Serializer para el detalle ==========
class MisSolicitudesDetalleSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Solicitud
        fields = [
            "id",
            "numero_solicitud",
            "fecha",
            "solicitante_nombre",
            "destinatario",
            "tipo_solicitud",
            "area",
            "estado",
            "total_soles",
            "total_dolares",
            "fecha_transferencia",
            "fecha_liquidacion",
            "banco",
            "numero_cuenta",
            "concepto_gasto",
            "observacion",
            "creado",
            "solicitante",
        ]

    def get_solicitante_nombre(self, obj):
        return obj.solicitante.get_full_name() or obj.solicitante.username

# ========== Serializer historial ==========
class SolicitudGastoEstadoHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudGastoEstadoHistorial
        fields = "__all__"
        read_only_fields = ("fecha_cambio",)

#========================================================================================

##=========================##
## ATENCIÓN DE SOLICITUDES ##
##=========================##
class SolicitudSerializer(serializers.ModelSerializer):
    # Nombre completo del solicitante usando CustomUser
    solicitante_nombre = serializers.SerializerMethodField()
    
    # Tipo de solicitud si tienes choices en el modelo
    tipo_descripcion = serializers.CharField(source="get_tipo_solicitud_display", read_only=True)

    class Meta:
        model = Solicitud
        fields = "__all__"
        read_only_fields = ["solicitante", "solicitante_nombre", "tipo_descripcion"]

    def get_solicitante_nombre(self, obj):
        """Devuelve el nombre completo del solicitante según CustomUser"""
        if obj.solicitante:
            return f"{obj.solicitante.nombre} {obj.solicitante.apellido}"
        return "-"

    def create(self, validated_data):
        """Asigna automáticamente el solicitante con el usuario autenticado"""
        validated_data['solicitante'] = self.context['request'].user
        return super().create(validated_data)

#========================================================================================

##===============##
## LIQUIDACIONES ##
##===============##
class LiquidacionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source="usuario.username", read_only=True)
    solicitud = serializers.SerializerMethodField()

    class Meta:
        model = Liquidacion
        fields = [
            "id",
            "numero_operacion",
            "usuario",
            "usuario_nombre",
            "fecha",
            "total_soles",
            "total_dolares",
            "estado",          # 👈 ahora es directamente el nombre legible
            "observaciones",
            "saldo_a_pagar",
            "vuelto",
            "solicitud",
        ]
        read_only_fields = [
            "numero_operacion",
            "total_soles",
            "total_dolares",
            "usuario_nombre",
            "saldo_a_pagar",
            "vuelto",
        ]

    def get_solicitud(self, obj):
        """Devuelve info resumida de la solicitud vinculada."""
        if not obj.solicitud:
            return None
        return {
            "id": obj.solicitud.id,
            "numero_solicitud": obj.solicitud.numero_solicitud,
            "tipo_solicitud": obj.solicitud.tipo_solicitud,
            "concepto_gasto": obj.solicitud.concepto_gasto,
            "total_soles": obj.solicitud.total_soles,
            "total_dolares": obj.solicitud.total_dolares,
            "estado": obj.solicitud.estado,  # 👈 mismo formato legible
        }

class SolicitudLiquidacionSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.CharField(source="solicitante.username", read_only=True)

    class Meta:
        model = Solicitud
        fields = [
            "id",
            "numero_solicitud",
            "tipo_solicitud",
            "monto_soles",
            "monto_dolares",
            "fecha",
            "estado",
            "solicitante_nombre",
        ]

class DocumentoGastoSerializer(serializers.ModelSerializer):
    archivo_url = serializers.SerializerMethodField()

    numero_documento = serializers.CharField(
        allow_null=True, required=False, default="ND"
    )
    fecha = serializers.DateField(
        allow_null=True, required=False
    )
    total = serializers.DecimalField(
        max_digits=15, decimal_places=2, allow_null=True, required=False, default=Decimal("0.00")
    )
    tipo_documento = serializers.CharField(
        allow_null=True, required=False, default="Boleta"
    )

    class Meta:
        model = DocumentoGasto
        fields = [
            "id", "solicitud", "numero_operacion", "fecha", "tipo_documento",
            "numero_documento", "ruc", "razon_social",
            "total", "nombre_archivo", "archivo", "archivo_url", "creado"
        ]

    def get_archivo_url(self, obj):
        """Devuelve la URL absoluta del archivo si existe"""
        if obj.archivo and hasattr(obj.archivo, "url"):
            request = self.context.get("request")
            return request.build_absolute_uri(obj.archivo.url) if request else obj.archivo.url
        return None

class CorreccionOCRSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorreccionOCR
        fields = "__all__"

#========================================================================================

##===========================##
## APROBACIÓN DE LIQUIDACIÓN ##
##===========================##

#========================================================================================

##============##
## CAJA CHICA ##
##============##
class CajaDiariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CajaDiaria
        fields = [
            'fecha',
            'monto_base',
            'monto_inicial',
            'monto_gastado',
            'monto_sobrante',
            'cerrada',
            'observaciones'
        ]

#========================================================================================

##=========================##
## REGISTRO DE ACTIVIDADES ##
##=========================##

#========================================================================================

##==================##
## GUÍAS DE SALIDAS ##
##==================##
class GuiaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuiaItem
        fields = ('id', 'cantidad', 'descripcion')

class GuiaSalidaSerializer(serializers.ModelSerializer):
    items = GuiaItemSerializer(many=True)

    class Meta:
        model = GuiaSalida
        fields = ('id', 'fecha', 'origen', 'destino', 'responsable', 'estado', 'observaciones', 'items')
        read_only_fields = ('id', 'fecha')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        guia = GuiaSalida.objects.create(**validated_data)
        for item in items_data:
            GuiaItem.objects.create(guia=guia, **item)
        return guia

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)  # si no viene, no tocamos items
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                GuiaItem.objects.create(guia=instance, **item)

        return instance

#========================================================================================

##=========================##
## ESTADÍSTICAS Y REPORTES ##
##=========================##

#========================================================================================

##===============##
## EDITAR PERFIL ##
##===============##

#========================================================================================

##====================##
## CAMBIAR CONTRASEÑA ##
##====================##

#========================================================================================


class UserSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'nombre_completo']

    def get_nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido}"




class ArqueoMovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArqueoMovimiento
        fields = '__all__'

class ArqueoAdjuntoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArqueoAdjunto
        fields = '__all__'

class ArqueoCajaSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField(read_only=True)
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='usuario',
        write_only=True,
        required=False
    )

    solicitudes = SolicitudGastoSimpleSerializer(many=True, read_only=True)  # solicitudes relacionadas
    movimientos = ArqueoMovimientoSerializer(many=True, read_only=True)
    adjuntos = ArqueoAdjuntoSerializer(many=True, read_only=True)

    class Meta:
        model = ArqueoCaja
        fields = [
            'id',
            'numero_operacion',
            'fecha',
            'usuario',
            'usuario_id',
            'entradas',
            'saldo_final',
            'observaciones',
            'cerrada',
            'created_at',
            'updated_at',
            'solicitudes',
            'movimientos',
            'adjuntos',
        ]
        read_only_fields = ['numero_operacion', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Genera número de operación si no viene
        if not validated_data.get('numero_operacion'):
            from .utils import generar_numero_operacion
            validated_data['numero_operacion'] = generar_numero_operacion()
        return super().create(validated_data)

class ArqueoCajaSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArqueoCaja
        fields = ['id', 'numero_operacion', 'fecha', 'saldo_final', 'cerrada']

class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'

class EstadoCajaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)
    fecha_hora_local = serializers.SerializerMethodField()

    class Meta:
        model = EstadoCaja
        fields = [
            'id',
            'estado',
            'fecha_hora',
            'fecha_hora_local',
            'usuario',
            'usuario_username'
        ]
        read_only_fields = [
            'id',
            'usuario',
            'usuario_username',
            'fecha_hora',
            'fecha_hora_local'
        ]

    def get_fecha_hora_local(self, obj):
        """
        Convierte fecha_hora a la zona horaria local y formato legible.
        Usa obj.fecha_hora ya cargado, sin consultas adicionales.
        """
        if obj.fecha_hora:
            return localtime(obj.fecha_hora).strftime('%Y-%m-%d %H:%M:%S')
        return None

    def create(self, validated_data):
        """
        Asigna el usuario autenticado al crear el registro.
        """
        request = self.context.get('request')
        if request and hasattr(request, "user") and request.user.is_authenticated:
            validated_data['usuario'] = request.user
        return super().create(validated_data)
    
class SolicitudParaLiquidarSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.CharField(source='solicitante.get_full_name', read_only=True)
    fecha_aprobacion = serializers.DateField(source='fecha', read_only=True)
    monto_aprobado = serializers.DecimalField(source='monto_soles', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Solicitud
        fields = [
            'id',
            'numero_solicitud',
            'fecha_aprobacion',
            'hora',
            'solicitante_nombre',
            'destinatario',
            'tipo_solicitud',
            'estado',
            'monto_aprobado',
            'monto_dolares',
            'fecha_transferencia',
            'fecha_liquidacion',
            'banco',
            'numero_cuenta',
            'concepto',
            'observacion',
        ]

class ActividadSerializer(serializers.ModelSerializer):
    usuario = serializers.StringRelatedField()  # Muestra el username

    class Meta:
        model = Actividad
        fields = ['id', 'usuario', 'tipo', 'accion', 'descripcion', 'fecha']

