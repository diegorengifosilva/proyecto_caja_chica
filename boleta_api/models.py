# boleta_api/models.py

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from boleta_api.extraccion import generar_numero_operacion
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal
from simple_history.models import HistoricalRecords
from django.contrib.auth.models import AbstractUser
from django.utils.crypto import get_random_string
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager, User


# USER #
AREAS_CHOICES = [
    ("Gerencia General", "Gerencia General"),
    ("Industria", "Industria"),
    ("Minería", "Minería"),
    ("Mantenimiento", "Mantenimiento"),
    ("Petroquímica", "Petroquímica"),
    ("Administración", "Administración"),
    ("Contabilidad", "Contabilidad"),
    ("Tecnología de la Información", "Tecnología de la Información"),
    ("Logística - Almacén", "Logística - Almacén"),
    ("Recursos Humanos", "Recursos Humanos"),
    ("Comercial", "Comercial"),
    ("SIG. HSEQ", "SIG. HSEQ"),
    ("Seguridad de Maquinaria", "Seguridad de Maquinaria"),
    ("Comité CSSO", "Comité CSSO"),
]

class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("El correo electrónico es obligatorio")
        if not extra_fields.get('nombre'):
            raise ValueError("El nombre es obligatorio")
        if not extra_fields.get('apellido'):
            raise ValueError("El apellido es obligatorio")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('rol', 'Administrador')
        if extra_fields.get('is_staff') is not True:
            raise ValueError("El superusuario debe tener is_staff=True.")
        if extra_fields.get('is_superuser') is not True:
            raise ValueError("El superusuario debe tener is_superuser=True.")
        return self._create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    username = None  # 🔴 elimina el username de AbstractUser
    email = models.EmailField(unique=True)
    nombre = models.CharField(max_length=50)
    apellido = models.CharField(max_length=50)
    empresa = models.CharField(max_length=100, blank=True, null=True)
    edad = models.PositiveIntegerField(blank=True, null=True)
    pais = models.CharField(max_length=50, blank=True, null=True)
    rol = models.CharField(max_length=50, blank=True, null=True)
    area = models.CharField(max_length=50, choices=AREAS_CHOICES, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre", "apellido"]

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.nombre} {self.apellido} <{self.email}>"

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
class Solicitud(models.Model):
    # Estados
    ESTADOS = [
        ("Pendiente de Envío", "Pendiente de Envío"),
        ("Pendiente para Atención", "Pendiente para Atención"),
        ("Atendido, Pendiente de Liquidación", "Atendido, Pendiente de Liquidación"),
        ("Liquidación enviada para Aprobación", "Liquidación enviada para Aprobación"),
        ("Liquidación Aprobada", "Liquidación Aprobada"),
        ("Rechazado", "Rechazado")
    ]

    # Tipos de solicitud
    TIPOS_SOLICITUD = [
        ("Viáticos", "Viáticos"),
        ("Movilidad", "Movilidad"),
        ("Compras", "Compras"),
        ("Otros Gastos", "Otros Gastos"),
    ]

    # Datos principales
    numero_solicitud = models.CharField(max_length=20, unique=True, db_index=True, editable=False)
    fecha = models.DateField(db_index=True, default=timezone.now)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="solicitudes_realizadas", db_index=True)
    destinatario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="solicitudes_recibidas", db_index=True)
    area = models.CharField(max_length=100)
    tipo_solicitud = models.CharField(max_length=50, choices=TIPOS_SOLICITUD, default="Compras")
    concepto_gasto = models.TextField(blank=True)

    # Estado
    estado = models.CharField(max_length=80, choices=ESTADOS, default="Pendiente de Envío", db_index=True)
    observacion = models.TextField(blank=True)

    # Datos financieros
    total_soles = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    total_dolares = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    # Fechas adicionales
    fecha_transferencia = models.DateField(null=True, blank=True, db_index=True)
    fecha_liquidacion = models.DateField(null=True, blank=True, db_index=True)

    # Datos bancarios
    banco = models.CharField(max_length=50, blank=True)
    numero_cuenta = models.CharField(max_length=50, blank=True)

    # Auditoría
    creado = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name = "Solicitud de Gasto"
        verbose_name_plural = "Solicitudes de Gasto"

    def save(self, *args, **kwargs):
        if not self.numero_solicitud:
            hoy = timezone.now()
            anio = hoy.year
            ultimo = Solicitud.objects.filter(numero_solicitud__startswith=f"SG-{anio}").order_by('-id').first()
            nuevo_num = (int(ultimo.numero_solicitud.split('-')[-1]) + 1) if ultimo else 1
            self.numero_solicitud = f"SG-{anio}-{nuevo_num:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_solicitud} | {self.solicitante.get_full_name()} | {self.estado}"

class SolicitudGastoEstadoHistorial(models.Model):
    solicitud = models.ForeignKey(Solicitud, on_delete=models.CASCADE, related_name="historial_estados")
    estado_anterior = models.CharField(max_length=80, choices=Solicitud.ESTADOS)
    estado_nuevo = models.CharField(max_length=80, choices=Solicitud.ESTADOS)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    fecha_cambio = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.solicitud.numero_solicitud}: {self.estado_anterior} → {self.estado_nuevo}"

#========================================================================================

##=========================##
## ATENCIÓN DE SOLICITUDES ##
##=========================##


#========================================================================================

##===============##
## LIQUIDACIONES ##
##===============##
class DocumentoGasto(models.Model):
    solicitud = models.ForeignKey(
        "Solicitud",
        on_delete=models.CASCADE,
        related_name="documentos"
    )
    liquidacion = models.ForeignKey(
        "Liquidacion",
        on_delete=models.CASCADE,
        related_name="documentos",
        blank=True,
        null=True
    )
    numero_operacion = models.CharField(
        max_length=30,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Número de Operación",
    )
    fecha = models.DateField(blank=True, null=True)
    tipo_documento = models.CharField(max_length=50, blank=True, null=True)
    numero_documento = models.CharField(max_length=50, blank=True, null=True)
    ruc = models.CharField(max_length=20, blank=True, null=True)
    razon_social = models.CharField(max_length=255, blank=True, null=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    nombre_archivo = models.CharField(max_length=255, blank=True, null=True)
    archivo = models.FileField(upload_to="documentos/", blank=True, null=True)
    creado = models.DateTimeField(auto_now_add=True)

class Liquidacion(models.Model):
    NUM_PREFIX = "LIQ"

    # ===============================
    # ESTADOS (directos, sin alias raros)
    # ===============================
    ESTADO_CHOICES = [
        ("Pendiente de Envío", "Pendiente de Envío"),                       
        ("Pendiente para Atención", "Pendiente para Atención"),             
        ("Atendido, Pendiente de Liquidación", "Atendido, Pendiente de Liquidación"),  
        ("Liquidación enviada para Aprobación", "Liquidación enviada para Aprobación"),
        ("Liquidación Aprobada", "Liquidación Aprobada"),
        ("Rechazado", "Rechazado"),
    ]

    numero_operacion = models.CharField(
        max_length=50, unique=True, db_index=True, blank=True, null=True
    )
    fecha = models.DateField(default=timezone.now, db_index=True)
    hora = models.TimeField(null=True, blank=True)

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="liquidaciones"
    )

    total_soles = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_dolares = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    estado = models.CharField(
        max_length=100,
        choices=ESTADO_CHOICES,
        default="Pendiente de Envío",
        db_index=True
    )
    observaciones = models.TextField(blank=True)

    solicitud = models.ForeignKey(
        "Solicitud",
        on_delete=models.CASCADE,
        related_name="liquidaciones",
        null=True,
        blank=True
    )

    # Auditoría
    history = HistoricalRecords(user_model=settings.AUTH_USER_MODEL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha", "-created_at"]
        indexes = [
            models.Index(fields=["numero_operacion"]),
            models.Index(fields=["fecha"]),
            models.Index(fields=["usuario"]),
            models.Index(fields=["estado"]),
        ]

    def __str__(self):
        return f"Liquidación {self.numero_operacion or 'Sin Número'} - {self.fecha} - {self.usuario}"

    # ===============================
    # MÉTODOS DE NEGOCIO
    # ===============================
    def calcular_totales(self):
        """
        Calcula los totales (soles y dólares) sumando documentos relacionados.
        """
        if not self.pk:
            return self.total_soles, self.total_dolares

        documentos = getattr(self, "documentos", None)
        if documentos is None:
            return self.total_soles, self.total_dolares

        total_s = sum([d.total or Decimal("0.00") for d in documentos.all() if d.moneda == "PEN"])
        total_d = sum([d.total or Decimal("0.00") for d in documentos.all() if d.moneda == "USD"])

        self.total_soles = total_s
        self.total_dolares = total_d
        return self.total_soles, self.total_dolares

    @property
    def saldo_a_pagar(self) -> Decimal:
        if not self.solicitud:
            return Decimal("0.00")
        diferencia = (self.total_soles or Decimal("0.00")) - (getattr(self.solicitud, "monto_solicitado", Decimal("0.00")) or Decimal("0.00"))
        return diferencia if diferencia > 0 else Decimal("0.00")

    @property
    def vuelto(self) -> Decimal:
        if not self.solicitud:
            return Decimal("0.00")
        diferencia = (getattr(self.solicitud, "monto_solicitado", Decimal("0.00")) or Decimal("0.00")) - (self.total_soles or Decimal("0.00"))
        return diferencia if diferencia > 0 else Decimal("0.00")

    def save(self, *args, **kwargs):
        if not self.hora:
            self.hora = timezone.now().time()

        if not self.numero_operacion:
            try:
                self.numero_operacion = generar_numero_operacion(self.NUM_PREFIX)
            except Exception:
                self.numero_operacion = f"{self.NUM_PREFIX}-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"

        super().save(*args, **kwargs)

        self.calcular_totales()
        super().save(update_fields=["total_soles", "total_dolares"])

class CorreccionOCR(models.Model):
    documento = models.ForeignKey(
        DocumentoGasto,
        on_delete=models.CASCADE,
        related_name="correcciones"
    )
    campo = models.CharField(max_length=100)  # Ej: 'RUC', 'Total', 'Razón Social'
    valor_original = models.CharField(max_length=255, null=True, blank=True)
    valor_correccion = models.CharField(max_length=255)
    fecha_correccion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.campo} corregido: '{self.valor_original}' → '{self.valor_correccion}'"
    
#========================================================================================

##===========================##
## APROBACIÓN DE LIQUIDACIÓN ##
##===========================##

#========================================================================================

##============##
## CAJA CHICA ##
##============##
class CajaDiaria(models.Model):
    fecha = models.DateField(unique=True)  # Un registro por día
    monto_base = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # monto puro ingresado por usuario
    monto_inicial = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # monto_base + rollover
    monto_gastado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    monto_sobrante = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cerrada = models.BooleanField(default=False)  # indica si ya se cerró
    observaciones = models.TextField(blank=True, null=True)

    def actualizar_sobrante(self):
        self.monto_sobrante = max(self.monto_inicial - self.monto_gastado, 0)
        self.save()

    def __str__(self):
        return (
            f"CajaDiaria {self.fecha}: Base {self.monto_base}, Inicial {self.monto_inicial}, "
            f"Gastado {self.monto_gastado}, Sobrante {self.monto_sobrante}, Cerrada: {self.cerrada}, "
            f"Obs: {self.observaciones}"
        )

#========================================================================================

##=========================##
## REGISTRO DE ACTIVIDADES ##
##=========================##

#========================================================================================

##==================##
## GUÍAS DE SALIDAS ##
##==================##
class GuiaSalida(models.Model):
    ESTADOS = (
        ('Pendiente', 'Pendiente'),
        ('Enviada', 'Enviada'),
        ('Recibida', 'Recibida'),
    )

    fecha = models.DateTimeField(auto_now_add=True)
    origen = models.CharField(max_length=150)
    destino = models.CharField(max_length=150)
    responsable = models.CharField(max_length=120)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='Pendiente')
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Guía #{self.id} - {self.origen} → {self.destino}"

class GuiaItem(models.Model):
    guia = models.ForeignKey(GuiaSalida, related_name='items', on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField()
    descripcion = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.cantidad} x {self.descripcion}"

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




class Notificacion(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    mensaje = models.TextField()
    leido = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notificación para {self.usuario} - {self.mensaje[:20]}"

class Actividad(models.Model):
    TIPO_ACCION_CHOICES = [
        ('Ingreso', 'Ingreso'),
        ('Egreso', 'Egreso'),
        ('Aprobación', 'Aprobación'),
        ('Eliminación', 'Eliminación'),
        ('Actualización', 'Actualización'),
    ]

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo = models.CharField(max_length=50, choices=TIPO_ACCION_CHOICES)
    accion = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario} - {self.tipo} - {self.accion}"

class SolicitudArqueo(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        EN_PROCESO = "en_proceso", "En Proceso"
        INCLUIDA_EN_ARQUEO = "incluida_en_arqueo", "Incluida en Arqueo"
        LIQUIDADA = "liquidada", "Liquidada"

    numero_operacion = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
        verbose_name="N° Operación"
    )
    fecha_solicitud = models.DateTimeField(
        default=timezone.now,
        verbose_name="Fecha de Solicitud"
    )
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="solicitudes_arqueo",
        verbose_name="Solicitante"
    )
    monto_arqueo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Monto del Arqueo"
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
        verbose_name="Estado"
    )
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción"
    )

    class Meta:
        verbose_name = "Solicitud de Arqueo"
        verbose_name_plural = "Solicitudes de Arqueo"
        ordering = ["-fecha_solicitud"]
        indexes = [
            models.Index(fields=["numero_operacion"]),
            models.Index(fields=["estado"]),
        ]

    def save(self, *args, **kwargs):
        # Generar número de operación solo si no existe
        if not self.numero_operacion:
            self.numero_operacion = OperacionSecuencia.generar_numero("SOL")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_operacion} - {self.descripcion or 'Sin descripción'}"

    def marcar_como_liquidada(self):
        """Método helper para marcar la solicitud como liquidada."""
        self.estado = self.Estado.LIQUIDADA
        self.save(update_fields=["estado"])

class ArqueoCaja(models.Model):
    numero_operacion = models.CharField(max_length=50, unique=True, db_index=True)
    fecha = models.DateField(default=timezone.now, db_index=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="arqueos_caja",
        db_index=True
    )
    entradas = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    saldo_final = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    observaciones = models.TextField(blank=True)
    cerrada = models.BooleanField(default=False, db_index=True)

    history = HistoricalRecords(user_model=settings.AUTH_USER_MODEL)

    def save(self, *args, **kwargs):
        if not self.numero_operacion:
            from boleta_api.models import OperacionSecuencia
            self.numero_operacion = OperacionSecuencia.generar_numero("ARQ")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Arqueo {self.numero_operacion} - {self.fecha} - Usuario: {self.usuario}"

class ArqueoMovimiento(models.Model):
    TIPOS = [
        ("entrada", "Entrada"),
        ("salida", "Salida"),
    ]
    ORIGENES = [
        ("manual", "Manual"),
        ("solicitud", "Solicitud"),
    ]

    arqueo = models.ForeignKey(ArqueoCaja, on_delete=models.CASCADE, related_name="movimientos")
    tipo = models.CharField(max_length=10, choices=TIPOS)
    descripcion = models.CharField(max_length=255)
    entradas = models.DecimalField(max_digits=12, decimal_places=2)
    origen = models.CharField(max_length=10, choices=ORIGENES, default="manual")
    solicitud_relacionada = models.ForeignKey(SolicitudArqueo, on_delete=models.SET_NULL, blank=True, null=True)

    def __str__(self):
        return f"{self.tipo} - {self.entradas}"

class ArqueoAdjunto(models.Model):
    TIPOS = [
        ("comprobante", "Comprobante"),
        ("foto", "Foto"),
        ("otro", "Otro"),
    ]
    arqueo = models.ForeignKey(ArqueoCaja, on_delete=models.CASCADE, related_name="adjuntos")
    archivo = models.FileField(upload_to="arqueos/")
    tipo = models.CharField(max_length=20, choices=TIPOS, default="comprobante")

class OperacionSecuencia(models.Model):
    tipo = models.CharField(max_length=50)
    fecha = models.DateField()
    secuencia = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('tipo', 'fecha')

    @classmethod
    def generar_numero(cls, tipo: str) -> str:
        fecha_actual = timezone.now().date()
        with transaction.atomic():
            secuencia_obj, creado = cls.objects.select_for_update().get_or_create(
                tipo=tipo,
                fecha=fecha_actual,
                defaults={'secuencia': 0}
            )
            secuencia_obj.secuencia += 1
            secuencia_obj.save()
        return f"{tipo.upper()}-{fecha_actual.strftime('%Y%m%d')}-{str(secuencia_obj.secuencia).zfill(4)}"

class EstadoCaja(models.Model):
    ABIERTO = 'Abierta'
    CERRADO = 'Cerrada'
    ESTADO_CHOICES = [(ABIERTO, 'Abierta'), (CERRADO, 'Cerrada')]

    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default=CERRADO, db_index=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="estados_caja",
        db_index=True
    )
    fecha_hora = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"Caja {self.estado} por {self.usuario} el {self.fecha_hora}"
