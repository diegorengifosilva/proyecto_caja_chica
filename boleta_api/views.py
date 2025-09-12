# boleta_api/views.py

# ─── Librerías estándar ─────────────────────────────
import os
import io
import re
import json
import uuid
import requests
import traceback
import unicodedata
import pandas as pd

# ─── Librerías de terceros ──────────────────────────
import cv2
import numpy as np
import pytesseract
import logging
from PIL import Image
from reportlab.pdfgen import canvas
from typing import Optional, List
from decimal import Decimal, InvalidOperation

from . import serializers
logger = logging.getLogger(__name__)

# ─── Django core ────────────────────────────────────
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db.models import Sum, Count, Q, Prefetch
from django.db.models.functions import TruncDate
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.db import transaction
from django.views.decorators.http import require_GET
from django.utils.dateparse import parse_date
from django.db.models import F

# ─── Django REST Framework ──────────────────────────
from rest_framework.decorators import api_view, parser_classes, permission_classes, action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status, viewsets, generics, filters, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.generics import RetrieveAPIView
from rest_framework_simplejwt.views import TokenObtainPairView

CACHE_LIST_KEY = "liquidacion_list"
CACHE_DETAIL_PREFIX = "liquidacion_detail_"

# ─── Modelos y Serializers propios ─────────────────
from django.conf import settings
from ocr.template_registry import obtener_plantilla_por_ruc
from datetime import date, datetime, timedelta
from django.utils.timezone import now
from .models import (
    EstadoCaja, 
    DocumentoGasto, 
    Notificacion, 
    CajaDiaria, 
    Solicitud, 
    ArqueoCaja,
    Actividad,
    GuiaSalida,
    Liquidacion,
    SolicitudGastoEstadoHistorial
    )
from .serializers import (
    RegisterSerializer,
    EmailTokenObtainPairSerializer,
    SolicitudGastoSerializer,
    SolicitudGastoSimpleSerializer, 
    DocumentoGastoSerializer, 
    CajaDiariaSerializer, 
    ArqueoCajaSerializer, 
    NotificacionSerializer,
    SolicitudSerializer,
    EstadoCajaSerializer,
    SolicitudParaLiquidarSerializer,
    ActividadSerializer,
    GuiaSalidaSerializer,
    LiquidacionSerializer,
    MisSolicitudesDetalleSerializer,
    MisSolicitudesTablaSerializer,
    SolicitudGastoEstadoHistorialSerializer
)

from boleta_api.extraccion import (
    aprobar_solicitud,
    set_monto_diario,
    validar_caja_abierta,
    validar_arqueo_unico_por_fecha,
    validar_solicitudes_no_asociadas,
    generar_numero_operacion
)

# Importar funciones de extraccion.py
from .extraccion import (
    detectar_numero_documento,
    detectar_fecha,
    detectar_ruc,
    detectar_razon_social,
    detectar_total,
    normalizar_texto_ocr,
    procesar_datos_ocr
)

pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"
os.environ["TESSDATA_PREFIX"] = r"C:\\Program Files\\Tesseract-OCR\\tessdata"

PLANTILLAS_DIR = os.path.join(os.path.dirname(__file__), "plantillas")

# ===== Obtener y asegurar token CSRF =====
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Establece una cookie CSRF en el cliente. 
    Útil para peticiones POST protegidas desde el frontend.
    """
    return JsonResponse({'message': 'CSRF token set correctly.'}, status=200)


#========================================================================================

#====================#
# PANTALLA PRINCIPAL #
#====================#
def home(request):
    """
    Página de inicio simple para verificar que el servidor está activo.
    """
    html = """
    <html>
        <head><title>Sistema de Caja Chica</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Bienvenido al Sistema de Caja Chica</h1>
            <p>Visita <a href="/api/"><code>/api/</code></a> para comenzar a usar la API.</p>
        </body>
    </html>
    """
    return HttpResponse(html)

#========================================================================================

##==============##
## PROGRAMACIÓN ##
##==============##

#========================================================================================

##====================##
## SOLICITUD DE GASTO ##
##====================##
# ========= Solicitud Dashboard View ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def solicitudes_dashboard_view(request):
    try:
        usuario = request.user
        solicitudes = Solicitud.objects.filter(solicitante=usuario)

        # Estados y Tipos disponibles en el modelo
        estados_validos = dict(Solicitud.ESTADOS).keys()
        estado_map = {estado: 0 for estado in estados_validos}

        tipo_map = {tipo: 0 for tipo in dict(Solicitud.TIPOS_SOLICITUD).keys()}

        # Variables para métricas
        este_mes = 0
        monto_total_soles = 0
        monto_total_dolares = 0
        meses = [0] * 12

        hoy = date.today()
        mes_actual = hoy.month - 1  # índice 0–11

        for s in solicitudes:
            # Estado
            estado = s.estado if s.estado in estados_validos else "Pendiente de Envío"
            estado_map[estado] += 1

            # Conteo mensual
            if s.fecha:
                meses[s.fecha.month - 1] += 1
                if s.fecha.month - 1 == mes_actual:
                    este_mes += 1

            # Montos
            monto_total_soles += float(s.total_soles or 0)
            monto_total_dolares += float(s.total_dolares or 0)

            # Tipo
            tipo = s.tipo_solicitud or "Otros Gastos"
            tipo_map[tipo] = tipo_map.get(tipo, 0) + 1

        total = solicitudes.count()
        monto_promedio = (monto_total_soles / total) if total > 0 else 0

        data = {
            "total": total,
            "esteMes": este_mes,
            "montoTotalSoles": round(monto_total_soles, 2),
            "montoTotalDolares": round(monto_total_dolares, 2),
            "montoPromedio": round(monto_promedio, 2),

            # Gráficas
            "chartAreaMes": [
                {"mes": date(1900, i + 1, 1).strftime("%b"), "solicitudes": m}
                for i, m in enumerate(meses)
            ],
            "chartRadialEstado": [
                {"name": e, "value": estado_map[e]} for e in estados_validos
            ],
            "chartTreemapTipo": [
                {"name": k, "value": v} for k, v in tipo_map.items()
            ],
        }

        return Response(data)

    except Exception as e:
        import traceback
        print("Error en solicitudes_dashboard_view:", traceback.format_exc())
        return Response({"error": str(e)}, status=500)

# ========= Guardar una Solicitud ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def guardar_solicitud(request):
    """
    Guarda una nueva solicitud en la base de datos.
    Estado inicial = 'Pendiente de Envío'
    """
    data = request.data.copy()

    # Normalizar campos
    field_map = {
        "numero_solicitud": "numero_solicitud",
        "fecha": "fecha",
        "destinatario": "destinatario",
        "tipo_solicitud": "tipo_solicitud",
        "area": "area",
        "total_soles": "total_soles",
        "total_dolares": "total_dolares",
        "fecha_transferencia": "fecha_transferencia",
        "fecha_liquidacion": "fecha_liquidacion",
        "banco": "banco",
        "numero_cuenta": "numero_cuenta",
        "concepto_gasto": "concepto_gasto",
        "observacion": "observacion",
    }

    cleaned_data = {}
    for key, value in field_map.items():
        if key in data:
            cleaned_data[value] = data[key]

    # Valores automáticos
    cleaned_data["solicitante"] = request.user.id
    cleaned_data["estado"] = "Pendiente de Envío"

    # Si no viene tipo_solicitud, poner "Otros Gastos"
    if not cleaned_data.get("tipo_solicitud"):
        cleaned_data["tipo_solicitud"] = "Otros Gastos"
    
    if "destinatario_id" in data:
        cleaned_data["destinatario"] = data["destinatario_id"]

    serializer = SolicitudSerializer(data=cleaned_data, context={'request': request})
    if serializer.is_valid():
        solicitud = serializer.save()
        return Response(SolicitudSerializer(solicitud).data, status=status.HTTP_201_CREATED)

    return Response({
        "error": "No se pudo guardar la solicitud. Verifica los campos.",
        "detalles": serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

# ========= Mis Solicitudes ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mis_solicitudes(request):
    solicitudes = Solicitud.objects.filter(
        solicitante=request.user
    ).order_by('-fecha')

    # Serializer ajustado a columnas solicitadas
    serializer = MisSolicitudesTablaSerializer(solicitudes, many=True)
    return Response(serializer.data)

# ========= Detalle Solicitud ==========
# ========= Detalle Solicitud ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_solicitud(request, solicitud_id):
    try:
        solicitud = Solicitud.objects.get(id=solicitud_id)
    except Solicitud.DoesNotExist:
        return Response({"error": "Solicitud no encontrada"}, status=404)

    # Usar el serializer principal que ya calcula destinatario_nombre
    serializer = SolicitudGastoSerializer(solicitud)
    return Response(serializer.data, status=200)

# ========= Actualizar Estado ==========
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def actualizar_estado_solicitud(request, solicitud_id):
    """
    Permite cambiar el estado de una solicitud según el flujo definido.
    Registra automáticamente en historial los cambios de estado.
    """
    try:
        solicitud = Solicitud.objects.get(id=solicitud_id)
    except Solicitud.DoesNotExist:
        return Response({"error": "Solicitud no encontrada"}, status=404)

    nuevo_estado = request.data.get("estado")
    if not nuevo_estado:
        return Response({"error": "Debe especificar un estado"}, status=400)

    estados_validos = dict(Solicitud.ESTADOS).keys()
    if nuevo_estado not in estados_validos:
        return Response({"error": "Estado no válido"}, status=400)

    # Definimos transiciones permitidas
    transiciones = {
        "Pendiente de Envío": ["Pendiente para Atención"],
        "Pendiente para Atención": ["Atendido, Pendiente de Liquidación", "Rechazado"],
        "Atendido, Pendiente de Liquidación": ["Liquidación enviada para Aprobación"],
        "Liquidación enviada para Aprobación": ["Liquidación Aprobada", "Rechazado"],
        "Liquidación Aprobada": [],
        "Rechazado": [],
    }

    # Validar si la transición es correcta
    if nuevo_estado not in transiciones.get(solicitud.estado, []):
        return Response({
            "error": f"No se puede cambiar de '{solicitud.estado}' a '{nuevo_estado}'."
        }, status=400)

    # 🔹 Ajuste clave: permitir que el solicitante envíe su propia solicitud
    if nuevo_estado in ["Pendiente para Atención"] and solicitud.estado == "Pendiente de Envío":
        # Esto permite que el propio usuario pase su solicitud a "Pendiente para Atención"
        pass
    # 🔹 Mantener la restricción para otros casos
    elif nuevo_estado in ["Liquidación Aprobada"] and solicitud.solicitante == request.user:
        return Response({
            "error": "No puede aprobar su propia solicitud"
        }, status=403)

    # Registrar usuario actual para historial
    solicitud._usuario_actual = request.user
    solicitud.estado = nuevo_estado
    solicitud.save()

    return Response({
        "mensaje": f"Estado actualizado a '{nuevo_estado}' correctamente.",
        "solicitud": MisSolicitudesDetalleSerializer(solicitud).data
    }, status=200)

# ========= Solicitud Gasto Historial ViewSet ==========
class SolicitudGastoHistorialViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.all().order_by("-fecha")
    serializer_class = SolicitudGastoSerializer
    permission_classes = [IsAuthenticated]

    # Acción personalizada para consultar historial
    @action(detail=True, methods=["get"], url_path="historial_estados")
    def historial_estados(self, request, pk=None):
        solicitud = self.get_object()
        historial = solicitud.historial_estados.all().order_by("-fecha_cambio")
        serializer = SolicitudGastoEstadoHistorialSerializer(historial, many=True)
        return Response(serializer.data)

# ========= Solicitud ViewSet ==========
class SolicitudViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista ligera solo para lectura de Solicitudes.
    Pensada para reportes/listados rápidos.
    """
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["liquidacion_numero_operacion", "solicitante__username"]
    ordering_fields = ["fecha", "total_soles", "total_dolares"]

    cache_list_key = "solicitud_list"
    cache_detail_prefix = "solicitud_detail_"

    def get_queryset(self):
        return (
            Solicitud.objects
            .select_related("solicitante")
            .only(
                "id", "liquidacion_numero_operacion", "fecha",
                "solicitante", "total_soles", "total_dolares"
            )
            .order_by("-fecha")
        )
    
#========================================================================================

##=========================##
## ATENCIÓN DE SOLICITUDES ##
##=========================##
# Solicitud Detail View #
class SolicitudDetailView(RetrieveAPIView):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]

# Solicitudes Pendientes View #
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def solicitudes_pendientes_view(request):
    """
    Devuelve todas las solicitudes pendientes para el usuario destinatario.
    """
    try:
        usuario = request.user
        estado = request.query_params.get("estado", "Pendiente para Atención")

        solicitudes = Solicitud.objects.filter(
            destinatario=usuario,
            estado=estado
        ).order_by('-fecha')

        serializer = SolicitudSerializer(solicitudes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        print("Error en solicitudes_pendientes_view:", traceback.format_exc())
        return Response(
            {"error": "No se pudieron obtener las solicitudes pendientes.", "detalle": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# ========= SolicitudGasto ViewSet CRUD ==========
class SolicitudGastoViewSetCRUD(viewsets.ModelViewSet):
    """
    CRUD principal de Solicitudes de Gasto.
    Incluye cache en list/retrieve y serializers optimizados.
    """
    serializer_class = SolicitudGastoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['solicitante__username', 'estado']
    ordering_fields = ['fecha', 'id']

    cache_list_key = CACHE_LIST_KEY
    cache_detail_prefix = CACHE_DETAIL_PREFIX

    queryset = Solicitud.objects.all()

    def get_queryset(self):
        return (
            Solicitud.objects
            .select_related('solicitante', 'arqueo', 'liquidacion')
            .order_by('-id')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return SolicitudGastoSimpleSerializer
        elif self.action == 'retrieve':
            return SolicitudGastoSerializer
        return super().get_serializer_class()

    def list(self, request, *args, **kwargs):
        data = cache.get(self.cache_list_key)
        if data:
            return Response(data)
        response = super().list(request, *args, **kwargs)
        cache.set(self.cache_list_key, response.data, timeout=60 * 5)
        return response

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        cache_key = f"{self.cache_detail_prefix}{pk}"
        data = cache.get(cache_key)
        if data:
            return Response(data)

        try:
            instance = self.get_object()
            serializer = SolicitudGastoSerializer(instance)
            response_data = serializer.data
        except Solicitud.DoesNotExist:
            return Response({"error": "Solicitud no encontrada"}, status=404)
        except Exception as e:
            import traceback
            print("ERROR EN RETRIEVE:", traceback.format_exc())
            return Response(
                {"error": "Error interno al obtener la solicitud"},
                status=500
            )

        cache.set(cache_key, response_data, timeout=60 * 5)
        return Response(response_data)

    def _invalidate_cache(self, instance=None):
        cache.delete(self.cache_list_key)
        if instance:
            cache.delete(f"{self.cache_detail_prefix}{instance.pk}")

    def perform_create(self, serializer):
        with transaction.atomic():
            instance = serializer.save(solicitante=self.request.user)
            self._invalidate_cache(instance)

    def perform_update(self, serializer):
        with transaction.atomic():
            instance = serializer.save()
            self._invalidate_cache(instance)

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        self._invalidate_cache(instance)

# Solicitud Decision View #
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def solicitud_decision_view(request, pk):
    try:
        solicitud = Solicitud.objects.get(pk=pk)
    except Solicitud.DoesNotExist:
        return Response({"error": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    decision = request.data.get("decision")
    comentario = request.data.get("comentario", "")

    if decision not in ["Atendido", "Rechazado", "Derivado"]:
        return Response({"error": "Decisión inválida."}, status=status.HTTP_400_BAD_REQUEST)

    # Asignar estado según decisión
    if decision == "Atendido":
        solicitud.estado = "Atendido, Pendiente de Liquidación"
        # Crear liquidación en estado borrador
        Liquidacion.objects.create(
            usuario=solicitud.solicitante,  # FK a User
            estado=Liquidacion.ESTADO_BORRADOR
        )
    elif decision == "Rechazado":
        solicitud.estado = "Rechazado"
    elif decision == "Derivado":
        # Puedes agregar lógica específica si se deriva
        pass

    if comentario:
        solicitud.observacion = comentario

    solicitud.save()

    return Response(
        {"message": f"Solicitud {decision.lower()} correctamente."},
        status=status.HTTP_200_OK
    )

#========================================================================================

##===============##
## LIQUIDACIONES ##
##===============##
# Endpoint Principal #
@api_view(['POST'])
@permission_classes([AllowAny])
def procesar_documento(request):
    """
    Procesa la imagen y extrae automáticamente:
    número de documento, tipo, fecha, RUC, razón social, concepto y total.
    Usa el OCR mejorado de extraccion.py para mayor consistencia.
    """
    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response({"error": "No se envió ningún archivo"}, status=400)

    try:
        img = Image.open(archivo)
        texto_crudo = pytesseract.image_to_string(img, lang="spa")
        texto_norm = normalizar_texto_ocr(texto_crudo)

        # DEBUG: mostrar primeras líneas del OCR normalizado
        print("📄 Primeras líneas OCR:", texto_norm.splitlines()[:10])

        # Usar procesador centralizado de OCR
        datos_extraidos = procesar_datos_ocr(texto_norm)

        # DEBUG: valor detectado de razón social antes de forzar defaults
        print("🔍 Razón social detectada:", datos_extraidos.get("razon_social"))

        # Completar datos adicionales desde el request
        datos_extraidos.update({
            "tipo_documento": request.data.get("tipo_documento", "Boleta"),
            "concepto": request.data.get("concepto", "Solicitud de gasto"),
            "nombre_archivo": archivo.name
        })

        # Asegurar campos críticos con valores por defecto
        datos_extraidos["numero_documento"] = datos_extraidos.get("numero_documento") or "ND"
        datos_extraidos["fecha"] = datos_extraidos.get("fecha") or date.today().strftime("%Y-%m-%d")
        datos_extraidos["total"] = datos_extraidos.get("total") or "0.00"
        
        # ⚠️ Solo aplicamos "RAZÓN SOCIAL DESCONOCIDA" si viene explícitamente None,
        # NO si viene cadena vacía o texto raro.
        if datos_extraidos.get("razon_social") is None:
            datos_extraidos["razon_social"] = "RAZÓN SOCIAL DESCONOCIDA"

        datos_extraidos["ruc"] = datos_extraidos.get("ruc") or "00000000000"

        return Response({
            "texto_extraido": texto_crudo,
            "datos_detectados": datos_extraidos
        }, status=200)

    except Exception as e:
        print("❌ Error en procesar_documento:", str(e))
        return Response({"error": f"Ocurrió un error procesando OCR: {str(e)}"}, status=500)

# Endpoint de prueba OCR #
@api_view(['POST'])
@permission_classes([AllowAny])
def test_ocr(request):
    """
    Devuelve todo el texto extraído del archivo para depuración.
    Útil para revisar cómo OCR interpreta la imagen.
    """
    archivo = request.FILES.get("archivo")
    if not archivo:
        return Response({"error": "No se envió ningún archivo"}, status=400)

    img = Image.open(archivo)
    texto_crudo = pytesseract.image_to_string(img, lang="spa")

    print("📄 OCR crudo:")
    print(texto_crudo)

    return Response({"texto_crudo": texto_crudo}, status=200)

# Guardar Documento #
@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser])
def guardar_documento(request):
    """
    Guarda un documento asociado a una solicitud,
    usando el OCR mejorado para extraer los campos críticos:
    numero_documento, fecha, ruc, razon_social y total.
    Se aplican valores por defecto solo si no se detectan.
    """
    try:
        # Validar solicitud
        solicitud_id = request.data.get("solicitud_id") or request.data.get("solicitud")
        if not solicitud_id:
            return Response({"error": "Falta el ID de la solicitud."}, status=400)
        solicitud = get_object_or_404(Solicitud, id=solicitud_id)

        # Validar archivo
        archivo = request.FILES.get("archivo")
        if not archivo:
            return Response({"error": "No se adjuntó archivo."}, status=400)

        # Procesar OCR
        img = Image.open(archivo)
        texto_crudo = pytesseract.image_to_string(img, lang="spa")
        texto_norm = normalizar_texto_ocr(texto_crudo)
        datos_extraidos = procesar_datos_ocr(texto_norm)

        # Debug: ver qué detecta antes de aplicar defaults
        print("🔎 Datos OCR detectados:", datos_extraidos)

        # Completar campos adicionales desde request
        datos_extraidos.update({
            "tipo_documento": request.data.get("tipo_documento") or "Boleta",
            "concepto": request.data.get("concepto") or "Solicitud de gasto",
            "nombre_archivo": archivo.name
        })

        # Aplicar defaults solo si faltan
        datos_extraidos["numero_documento"] = datos_extraidos.get("numero_documento") or "ND"
        datos_extraidos["fecha"] = datos_extraidos.get("fecha") or date.today().strftime("%Y-%m-%d")
        datos_extraidos["ruc"] = datos_extraidos.get("ruc") or "00000000000"
        if not datos_extraidos.get("razon_social"):  # Solo si sigue vacío
            datos_extraidos["razon_social"] = "RAZÓN SOCIAL DESCONOCIDA"
        datos_extraidos["total"] = datos_extraidos.get("total") or "0.00"

        # Limpiar total para Decimal
        total = str(datos_extraidos["total"]).replace("S/", "").replace("s/", "").strip()
        try:
            datos_extraidos["total"] = Decimal(total)
        except (InvalidOperation, TypeError):
            datos_extraidos["total"] = Decimal("0.00")

        # Generar número de operación
        datos_extraidos["numero_operacion"] = generar_numero_operacion("DOC")
        datos_extraidos["solicitud"] = solicitud.id
        datos_extraidos["archivo"] = archivo

        # Guardar con serializer
        serializer = DocumentoGastoSerializer(data=datos_extraidos, context={"request": request})
        if serializer.is_valid():
            documento = serializer.save()
            archivo_url = request.build_absolute_uri(documento.archivo.url)
            return Response({
                "mensaje": "Documento guardado correctamente",
                "numero_operacion": datos_extraidos["numero_operacion"],
                "documento": {**serializer.data, "archivo_url": archivo_url}
            }, status=201)

        return Response({"error": "No se pudo guardar el documento", "detalle": serializer.errors}, status=400)

    except Exception as e:
        print("❌ Error al guardar documento:", str(e))
        return Response({"error": f"No se pudo guardar el documento: {str(e)}"}, status=500)

# Obtener documentos asociados a una solicitud #
@api_view(['GET'])
def obtener_documentos_por_solicitud(request, solicitud_id):
    """
    Retorna todos los documentos asociados a una solicitud de gasto específica.
    """
    documentos = DocumentoGasto.objects.filter(solicitud_id=solicitud_id)
    serializer = DocumentoGastoSerializer(documentos, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)

# Clasificar Tipo Documento #
def clasificar_tipo_documento(ocr_text):
    """
    Clasifica el tipo de documento (boleta, factura o recibo por honorarios)
    a partir del texto OCR, con tolerancia a errores comunes y variaciones.
    """
    def normalizar(texto):
        texto = unicodedata.normalize('NFKD', texto)
        texto = texto.encode('ASCII', 'ignore').decode('utf-8')
        return texto.upper()

    texto = normalizar(ocr_text)

    patrones = {
        "recibo": [
            r"RECIB[O0]\s*(POR)?\s*HONORARIOS",
            r"\bR\.?H\.?\b",
            r"SERVICIO(S)?\s+PROFESIONAL(ES)?",
            r"RECIBO\s+N?\.?\s*\d+"
        ],
        "boleta": [
            r"BOLETA\s*(DE)?\s*VENTA",
            r"\bB\.?V\.?\b",
            r"\bB0LETA\b",  # con cero
        ],
        "factura": [
            r"FACTURA(\s+ELECTRONICA)?",
            r"\bF\.?E\.?\b",
            r"\bF@CTURA\b",  # error OCR
            r"FACTURA\s+N?\.?\s*\d+"
        ]
    }

    for tipo, expresiones in patrones.items():
        for patron in expresiones:
            if re.search(patron, texto):
                return tipo

    return "desconocido"

# Detectar Origen de la Imagen #
def detectar_origen_imagen(img_bgr, umbral_blur=100.0, umbral_sombra=25.0):
    """
    Determina si una imagen es escaneada o tomada con cámara (foto).
    Devuelve 'escaneo' o 'foto'.
    """
    # Paso 1: Desenfoque - medimos el Laplaciano
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Paso 2: Detección de sombras (iluminación desigual)
    sombra = cv2.equalizeHist(gray)
    media_sombra = np.std(sombra)

    # Paso 3: Relación de aspecto no estándar
    alto, ancho = gray.shape
    aspecto = max(alto, ancho) / min(alto, ancho)

    # Lógica de decisión (puedes ajustarla con pruebas)
    if laplacian_var > umbral_blur and media_sombra < umbral_sombra and aspecto < 1.5:
        return 'escaneo'
    else:
        return 'foto'

#========================================================================================

##===========================##
## APROBACIÓN DE LIQUIDACIÓN ##
##===========================##
# Detalle Liquidacion Views #
TASA_CAMBIO = 3.55  # S/ -> $

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_liquidacion_view(request, liquidacion_id):
    try:
        liquidacion = Liquidacion.objects.get(id=liquidacion_id)
    except Liquidacion.DoesNotExist:
        return Response({"error": "Liquidación no encontrada"}, status=404)

    # Serializar liquidación
    liquidacion_data = LiquidacionSerializer(liquidacion).data

    # Traer documentos asociados a las solicitudes de la liquidación
    documentos = DocumentoGasto.objects.filter(solicitud__liquidacion=liquidacion)
    documentos_data = DocumentoGastoSerializer(documentos, many=True, context={"request": request}).data

    # Calcular total_documentado
    total_documentado_soles = sum([doc.total or Decimal("0.00") for doc in documentos])
    total_documentado_dolares = total_documentado_soles / Decimal(TASA_CAMBIO)

    # Agregar totales y diferencia
    liquidacion_data.update({
        "total_documentado_soles": total_documentado_soles,
        "total_documentado_dolares": round(total_documentado_dolares, 2),
        "diferencia_soles": (liquidacion.monto_soles or Decimal("0.00")) - total_documentado_soles,
        "diferencia_dolares": (liquidacion.monto_dolares or Decimal("0.00")) - total_documentado_dolares,
        "documentos": documentos_data
    })

    return Response(liquidacion_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def actualizar_estado_liquidacion(request, liquidacion_id):
    """
    Aprueba o rechaza una liquidación.
    Si se aprueba, calcula automáticamente diferencia, saldo_a_pagar o vuelto.
    """
    accion = request.data.get("accion")  # 'aprobar' o 'rechazar'
    if accion not in ["aprobar", "rechazar"]:
        return Response({"error": "Acción inválida"}, status=400)

    try:
        liquidacion = Liquidacion.objects.get(id=liquidacion_id)
    except Liquidacion.DoesNotExist:
        return Response({"error": "Liquidación no encontrada"}, status=404)

    total_documentado = (
        liquidacion.documentos.aggregate(total_sum=Sum('total'))['total_sum']
        or Decimal("0.00")
    )
    diferencia = (liquidacion.monto or Decimal("0.00")) - total_documentado

    with transaction.atomic():
        if accion == "aprobar":
            if diferencia == 0:
                liquidacion.estado = "Aprobado"
                liquidacion.saldo_a_pagar = Decimal("0.00")
                liquidacion.vuelto = Decimal("0.00")
            elif diferencia > 0:
                liquidacion.estado = "Aprobado con ajuste"
                liquidacion.saldo_a_pagar = diferencia  # pagar extra al solicitante
                liquidacion.vuelto = Decimal("0.00")
            else:  # diferencia < 0
                liquidacion.estado = "Aprobado con ajuste"
                liquidacion.vuelto = abs(diferencia)  # solicitante devuelve
                liquidacion.saldo_a_pagar = Decimal("0.00")
        else:  # accion == "rechazar"
            liquidacion.estado = "Rechazado"
            liquidacion.saldo_a_pagar = Decimal("0.00")
            liquidacion.vuelto = Decimal("0.00")

        liquidacion.save()

    return Response({
        "mensaje": f"Liquidación {accion} correctamente.",
        "estado": liquidacion.estado,
        "total_documentado": str(total_documentado),
        "diferencia": str(diferencia),
        "saldo_a_pagar": str(getattr(liquidacion, 'saldo_a_pagar', 0)),
        "vuelto": str(getattr(liquidacion, 'vuelto', 0)),
    })

#========================================================================================

##============##
## CAJA CHICA ##
##============##
# ========= Caja Diaria View ==========
MAX_MONTO_DIARIO = 5000.00  # Límite del monto Diario

class CajaDiariaView(APIView):
    def post(self, request):
        fecha_hoy = now().date()
        caja = CajaDiaria.objects.filter(fecha=fecha_hoy).first()

        if caja and caja.cerrada:
            return Response({'error': 'La caja diaria ya está cerrada y no se puede modificar.'}, status=status.HTTP_400_BAD_REQUEST)

        monto_base_raw = request.data.get('monto_base')
        observaciones = request.data.get('observaciones', "")  # 🔥 capturamos observaciones

        if monto_base_raw is None:
            return Response({'error': 'Monto base es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            monto_base = float(monto_base_raw)
        except (ValueError, TypeError):
            return Response({'error': 'Monto base debe ser un número'}, status=status.HTTP_400_BAD_REQUEST)

        if monto_base < 0:
            return Response({'error': 'Monto base no puede ser negativo'}, status=status.HTTP_400_BAD_REQUEST)

        if monto_base > MAX_MONTO_DIARIO:
            return Response({
                'error': f'El monto ingresado ({monto_base}) supera el límite diario permitido ({MAX_MONTO_DIARIO}).'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Acumular sobrantes de días anteriores
        sobrante_acumulado = 0.0
        fecha_iter = fecha_hoy - timedelta(days=1)

        while fecha_iter >= fecha_hoy - timedelta(days=30):
            caja_dia = CajaDiaria.objects.filter(fecha=fecha_iter).first()
            if caja_dia:
                sobrante_acumulado += float(caja_dia.monto_sobrante)
                fecha_iter -= timedelta(days=1)
            else:
                break

        rollover = max(sobrante_acumulado, 0)
        monto_inicial = monto_base + rollover

        caja, created = CajaDiaria.objects.update_or_create(
            fecha=fecha_hoy,
            defaults={
                'monto_base': monto_base,
                'monto_inicial': monto_inicial,
                'observaciones': observaciones
            }
        )
        serializer = CajaDiariaSerializer(caja)
        return Response(serializer.data)

    def put(self, request):
        """
        Endpoint para cerrar la caja diaria actual.
        """
        fecha_hoy = now().date()
        caja = CajaDiaria.objects.filter(fecha=fecha_hoy).first()
        if not caja:
            return Response({'error': 'No existe caja diaria para hoy'}, status=status.HTTP_404_NOT_FOUND)
        if caja.cerrada:
            return Response({'error': 'La caja diaria ya está cerrada'}, status=status.HTTP_400_BAD_REQUEST)

        caja.cerrada = True
        caja.save()
        return Response({'mensaje': 'Caja diaria cerrada exitosamente'})

#========================================================================================

##=========================##
## REGISTRO DE ACTIVIDADES ##
##=========================##
class ActividadListView(APIView):
    def get(self, request):
        actividades = Actividad.objects.all().order_by('-fecha')
        serializer = ActividadSerializer(actividades, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

#========================================================================================

##==================##
## GUÍAS DE SALIDA ##
##==================##
class GuiaSalidaViewSet(viewsets.ModelViewSet):
    queryset = GuiaSalida.objects.all().prefetch_related('items')
    serializer_class = GuiaSalidaSerializer

    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        guia = self.get_object()
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in dict(GuiaSalida.ESTADOS):
            return Response({'detail': 'Estado inválido'}, status=status.HTTP_400_BAD_REQUEST)
        guia.estado = nuevo_estado
        guia.save()
        return Response(self.get_serializer(guia).data)

#========================================================================================

##=========================##
## ESTADÍSTICAS Y REPORTES ##
##=========================##
# Gastos por Categoria #
@csrf_exempt
def gastos_por_categoria(request):
    """
    API para devolver el total de gastos agrupados por categoría,
    con filtros opcionales de fecha y categoría específica.
    """
    fecha_inicio = request.GET.get("fechaInicio")
    fecha_fin = request.GET.get("fechaFin")
    categoria = request.GET.get("categoria")

    gastos = Solicitud.objects.all()

    if fecha_inicio:
        gastos = gastos.filter(fecha__gte=parse_date(fecha_inicio))
    if fecha_fin:
        gastos = gastos.filter(fecha__lte=parse_date(fecha_fin))
    if categoria:
        gastos = gastos.filter(categoria__id=categoria)

    data = gastos.values("categoria__nombre").annotate(total=Sum("monto")).order_by("-total")

    return JsonResponse(list(data), safe=False)

# Exportar Reportes Excel #
@csrf_exempt
def exportar_reportes_excel(request):
    """
    Exporta los gastos filtrados a un archivo Excel.
    """
    fecha_inicio = request.GET.get("fechaInicio")
    fecha_fin = request.GET.get("fechaFin")
    categoria = request.GET.get("categoria")

    gastos = Solicitud.objects.all()

    if fecha_inicio:
        gastos = gastos.filter(fecha__gte=parse_date(fecha_inicio))
    if fecha_fin:
        gastos = gastos.filter(fecha__lte=parse_date(fecha_fin))
    if categoria:
        gastos = gastos.filter(categoria__id=categoria)

    df = pd.DataFrame(list(gastos.values("fecha", "categoria__nombre", "monto", "descripcion")))

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Gastos")
    buffer.seek(0)

    response = HttpResponse(
        buffer,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    response["Content-Disposition"] = 'attachment; filename="reporte_gastos.xlsx"'
    return response

# Exportar Reportes PDF #
@csrf_exempt
def exportar_reportes_pdf(request):
    """
    Exporta los gastos filtrados a un archivo PDF básico.
    """
    fecha_inicio = request.GET.get("fechaInicio")
    fecha_fin = request.GET.get("fechaFin")
    categoria = request.GET.get("categoria")

    gastos = Solicitud.objects.all()

    if fecha_inicio:
        gastos = gastos.filter(fecha__gte=parse_date(fecha_inicio))
    if fecha_fin:
        gastos = gastos.filter(fecha__lte=parse_date(fecha_fin))
    if categoria:
        gastos = gastos.filter(categoria__id=categoria)

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.setFont("Helvetica", 12)
    p.drawString(100, 800, "Reporte de Gastos")

    y = 770
    for g in gastos:
        p.drawString(80, y, f"{g.fecha} - {g.categoria.nombre} - S/. {g.monto} - {g.descripcion}")
        y -= 20
        if y < 50:
            p.showPage()
            y = 800

    p.save()
    buffer.seek(0)

    response = HttpResponse(buffer, content_type="application/pdf")
    response["Content-Disposition"] = 'attachment; filename="reporte_gastos.pdf"'
    return response

#========================================================================================

##===============##
## EDITAR PERFIL ##
##===============##

#========================================================================================

##====================##
## CAMBIAR CONTRASEÑA ##
##====================##

#========================================================================================

##=======================##
## FUNCIONES ADICIONALES ##
##=======================##
#====== Datos Usuario ======
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuario_actual(request):
    """
    Devuelve información del usuario autenticado, incluyendo área.
    """
    user = request.user
    data = {
        "id": user.id,
        "nombre": user.nombre,
        "apellido": user.apellido,
        "email": user.email,
        "rol": user.rol,
        "area": user.area.id if user.area else None,
        "area_nombre": user.area.nombre if user.area else "",
    }
    return Response(data)

#===== Vista de registro =====
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'nombre': user.nombre,
                'apellido': user.apellido,
                'rol': user.rol,
                'area': user.area,
            },
            'message': 'Registro exitoso'
        }, status=status.HTTP_201_CREATED)

#===== Vista de login personalizada que devuelve también datos del usuario =====
class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
#========================================================================================



# 🧾 SOLICITUDES DE GASTO
# ===== Crear Solicitud de Gasto =====
class CrearSolicitudGastoView(generics.CreateAPIView):
    """
    Vista para crear una nueva Solicitud de Gasto.
    Asigna automáticamente el solicitante (FK a User) y el área en base al usuario autenticado.
    """
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudGastoSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        usuario = self.request.user
        # Guardamos directamente la relación con el usuario (ForeignKey)
        serializer.save(
            solicitante=usuario,
            area=getattr(usuario, "area", "")
        )

# ========= Aprobar una solicitud ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def aprobar_solicitud_view(request, solicitud_id):
    try:
        solicitud = Solicitud.objects.get(id=solicitud_id)
        if solicitud.estado == "Aprobada":
            return Response({"error": "Solicitud ya aprobada"}, status=400)

        fecha_hoy = date.today()
        caja, creado = CajaDiaria.objects.get_or_create(fecha=fecha_hoy)
        monto_disponible = float(caja.monto_inicial or 0) - float(caja.monto_gastado or 0)

        if float(solicitud.monto_soles or 0) > monto_disponible:
            return Response({"error": "No hay suficiente monto disponible para aprobar esta solicitud"}, status=400)

        # Llamar función que aprueba y actualiza caja
        aprobar_solicitud(solicitud_id)

        return Response({"mensaje": "Solicitud aprobada correctamente"})

    except Solicitud.DoesNotExist:
        return Response({"error": "Solicitud no encontrada"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)





# ========= Establecer monto diario ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_monto_diario_view(request):
    try:
        monto_str = request.data.get('monto')
        if monto_str is None:
            return Response({"error": "El campo 'monto' es obligatorio"}, status=400)
        
        monto = float(monto_str)
        if monto < 0:
            return Response({"error": "El monto no puede ser negativo"}, status=400)

        fecha_str = request.data.get('fecha')
        if fecha_str:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Formato de fecha inválido, debe ser yyyy-mm-dd"}, status=400)
        else:
            fecha = date.today()

        set_monto_diario(fecha, monto)
        return Response({"mensaje": f"Monto diario establecido para {fecha}: {monto}"})

    except Exception as e:
        return Response({"error": str(e)}, status=500)



# 🧾 ATENCION DE SOLICITUDES


# ========= Liquidaciones Pendientes View ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liquidaciones_pendientes(request):
    """
    Devuelve todas las solicitudes de gasto que estén pendientes de liquidar.
    """
    try:
        solicitudes = Solicitud.objects.filter(
            estado="Pendiente",
            fecha_liquidacion__isnull=True
        ).order_by('-fecha', '-hora')  # Más reciente primero

        serializer = SolicitudParaLiquidarSerializer(solicitudes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Ocurrió un error al obtener las liquidaciones pendientes: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 🧾 APROBACION DE SOLICITUDES
# ========= Liquidaciones Aprobación ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liquidaciones_aprobacion(request):
    """
    Listado de liquidaciones pendientes para aprobación.
    Filtra por estado 'EN_PROCESO' (pendiente de aprobación).
    """
    liquidaciones = Liquidacion.objects.filter(estado=Liquidacion.ESTADO_EN_PROCESO).order_by('-fecha', '-created_at')
    serializer = LiquidacionSerializer(liquidaciones, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# ========= Liquidaciones ACción ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def liquidacion_accion(request, pk):
    """
    Cambia el estado de una liquidación según la acción del aprobador.
    Payload esperado: { "accion": "aprobar" | "rechazar" | "devolucion" }
    """
    accion = request.data.get('accion')
    if accion not in ['aprobar', 'rechazar', 'devolucion']:
        return Response({"error": "Acción inválida."}, status=status.HTTP_400_BAD_REQUEST)

    liquidacion = get_object_or_404(Liquidacion, pk=pk)

    with transaction.atomic():
        if accion == 'aprobar':
            liquidacion.estado = Liquidacion.ESTADO_CERRADA
        elif accion == 'rechazar':
            liquidacion.estado = Liquidacion.ESTADO_BORRADOR
        elif accion == 'devolucion':
            # Aquí puedes definir un estado especial de devolución si quieres
            liquidacion.estado = 'DEVOLUCION'

        liquidacion.save()
        serializer = LiquidacionSerializer(liquidacion)
        return Response(serializer.data, status=status.HTTP_200_OK)








#  📦 ARQUEO DE CAJA
# ========= Arqueos View ==========
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def arqueos_view(request):
    if request.method == 'GET':
        search = request.query_params.get('search', '').strip()
        queryset = ArqueoCaja.objects.all().order_by('-fecha', '-hora')

        if search:
            # Buscar por número operación o fecha (string)
            queryset = queryset.filter(
                Q(numeroOperacion__icontains=search) |
                Q(fecha__icontains=search)
            )

        paginator = ArqueoCajaPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ArqueoCajaSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    elif request.method == 'POST':
        serializer = ArqueoCajaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

# ========= Arqueo Caja ViewSet ==========
class ArqueoCajaViewSet(viewsets.ModelViewSet):
    queryset = ArqueoCaja.objects.all()
    serializer_class = ArqueoCajaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    cache_list_key = "arqueo_caja_list"
    cache_detail_prefix = "arqueo_caja_detail_"

    search_fields = ["numero_operacion", "usuario__username"]
    ordering_fields = ["fecha", "saldo_final"]

    def get_queryset(self):
        # Evitamos N+1 y solo traemos campos necesarios
        return (
            ArqueoCaja.objects
            .select_related('usuario')  # usuario FK
            .prefetch_related(
                'solicitudes_asociadas',
                'movimientos',
                'adjuntos'
            )
            .only(
                'id', 'numero_operacion', 'fecha', 'usuario__username',
                'saldo_final', 'cerrada', 'entradas'
            )
            .order_by("-fecha")
        )

    # Métodos con caché
    def list(self, request, *args, **kwargs):
        cache_key = "arqueo_caja_list"
        data = cache.get(cache_key)
        if not data:
            response = super().list(request, *args, **kwargs)
            cache.set(cache_key, response.data, timeout=300)  # 5 min
            return response
        return self._cached_response(data)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        cache_key = f"arqueo_caja_{pk}"
        data = cache.get(cache_key)
        if not data:
            response = super().retrieve(request, *args, **kwargs)
            cache.set(cache_key, response.data, timeout=300)
            return response
        return self._cached_response(data)

    def _cached_response(self, data):
        from rest_framework.response import Response
        return Response(data)

    def _invalidate_cache(self, pk=None):
        cache.delete("arqueo_caja_list")
        if pk:
            cache.delete(f"arqueo_caja_{pk}")

    # Creación / actualización / borrado
    def perform_create(self, serializer):
        validar_caja_abierta()
        fecha = serializer.validated_data.get('fecha')
        validar_arqueo_unico_por_fecha(fecha)

        solicitudes_ids = serializer.validated_data.get('solicitudes_asociadas', [])
        validar_solicitudes_no_asociadas(solicitudes_ids)

        instance = serializer.save(usuario=self.request.user)
        self._invalidate_cache(pk=instance.pk)  # Limpia lista y detalle

    def perform_update(self, serializer):
        validar_caja_abierta()
        arqueo = self.get_object()
        if arqueo.cerrada:
            raise ValidationError("No se puede modificar un arqueo cerrado.")

        solicitudes_ids = serializer.validated_data.get('solicitudes_asociadas', [])
        validar_solicitudes_no_asociadas(solicitudes_ids)

        instance = serializer.save()
        self._invalidate_cache(pk=instance.pk)  # Limpia lista y detalle

    def perform_destroy(self, instance):
        pk = instance.pk
        super().perform_destroy(instance)
        self._invalidate_cache(pk=pk)  # Limpia lista y detalle


    def update(self, request, *args, **kwargs):
        arqueo = self.get_object()
        if arqueo.cerrada:
            return Response({'error': 'No se puede modificar un arqueo cerrado.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        arqueo = self.get_object()
        if arqueo.cerrada:
            return Response({'error': 'No se puede modificar un arqueo cerrado.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def aprobar_solicitud(self, request, pk=None):
        arqueo = self.get_object()
        if arqueo.cerrada:
            return Response({'error': 'No se puede agregar solicitudes a un arqueo cerrado.'}, status=status.HTTP_400_BAD_REQUEST)

        solicitud_id = request.data.get('solicitud_id')
        if not solicitud_id:
            return Response({'error': 'Debe enviar solicitud_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            solicitud = SolicitudGasto.objects.get(id=solicitud_id)
        except SolicitudGasto.DoesNotExist:
            return Response({'error': 'Solicitud no encontrada'}, status=status.HTTP_404_NOT_FOUND)

        if solicitud.estado == 'Aprobada':
            return Response({'message': 'Solicitud ya está aprobada'}, status=status.HTTP_200_OK)

        solicitud.estado = 'Aprobada'
        solicitud.arqueo = arqueo
        solicitud.save()

        arqueo.entradas += float(solicitud.monto_soles or 0)
        arqueo.save()

        # Limpiar caché porque se modificó el arqueo
        self._invalidate_cache(pk=arqueo.pk)

        return Response({'message': 'Solicitud aprobada y asociada al arqueo'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='abrir-caja')
    def abrir_caja(self, request):
        estado_caja, _ = EstadoCaja.objects.get_or_create(id=1)
        if estado_caja.estado == EstadoCaja.ABIERTO:
            return Response({'error': 'La caja ya está abierta.'}, status=status.HTTP_400_BAD_REQUEST)
        estado_caja.estado = EstadoCaja.ABIERTO
        estado_caja.usuario = request.user
        estado_caja.fecha_hora = timezone.now()
        estado_caja.save()
        return Response({'mensaje': 'Caja abierta exitosamente.'})

    @action(detail=False, methods=['post'], url_path='cerrar-caja')
    def cerrar_caja(self, request):
        estado_caja, _ = EstadoCaja.objects.get_or_create(id=1)
        if estado_caja.estado == EstadoCaja.CERRADO:
            return Response({'error': 'La caja ya está cerrada.'}, status=status.HTTP_400_BAD_REQUEST)
        estado_caja.estado = EstadoCaja.CERRADO
        estado_caja.usuario = request.user
        estado_caja.fecha_hora = timezone.now()
        estado_caja.save()

        reporte = self.generar_reporte_resumen()
        return Response({'mensaje': 'Caja cerrada exitosamente.', 'reporte_resumen': reporte})

    @action(detail=False, methods=['get'], url_path='estado-caja')
    def estado_caja(self, request):
        ultimo_estado = EstadoCaja.objects.order_by('-fecha_hora').first()
        if ultimo_estado:
            return Response({
                'estado': ultimo_estado.estado,
                'fecha_hora': ultimo_estado.fecha_hora,
                'usuario': ultimo_estado.usuario.username if ultimo_estado.usuario else None,
            })
        else:
            return Response({'estado': 'No registrado', 'fecha_hora': None, 'usuario': None})

    def generar_reporte_resumen(self):
        # Usamos una sola consulta con aggregate
        arqueos_cerrados = ArqueoCaja.objects.filter(cerrada=True)
        reporte = arqueos_cerrados.aggregate(
            total_entradas=Sum('entradas'),
            total_saldo_final=Sum('saldo_final'),
            cantidad_arqueos=Count('id')
        )
        return {
            'total_entradas': reporte['total_entradas'] or 0,
            'total_saldo_final': reporte['total_saldo_final'] or 0,
            'cantidad_arqueos': reporte['cantidad_arqueos'] or 0,
            'diferencia_total': (reporte['total_entradas'] or 0) - (reporte['total_saldo_final'] or 0),
        }

# ========= Solicitud List ==========
class SolicitudList(generics.ListAPIView):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nro_solicitud', 'estado']
    ordering_fields = ['fecha', 'monto_soles']
    
# ===== Historial Caja Diaria View =====
class HistorialCajaDiariaView(APIView):
    def get(self, request):
        try:
            hoy = date.today()
            inicio = hoy - timedelta(days=6)  # últimos 7 días incluyendo hoy
            cajas = CajaDiaria.objects.filter(fecha__range=[inicio, hoy]).order_by('fecha')

            data = []
            for caja in cajas:
                disponible = float(caja.monto_inicial - caja.monto_gastado)
                gastado = float(caja.monto_gastado)
                data.append({
                    "fecha": caja.fecha.strftime("%Y-%m-%d"),
                    "disponible": round(disponible, 2),
                    "gastado": round(gastado, 2),
                })

            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






# ===== Solicitudes Aprobadas View =====
class SolicitudesAprobadasView(APIView):
    def get(self, request):
        try:
            hoy = date.today()
            inicio = hoy - timedelta(days=6)  # últimos 7 días incluyendo hoy

            solicitudes = (
                Solicitud.objects
                .filter(fecha_solicitud__range=[inicio, hoy], estado='aprobada')
                .annotate(fecha=TruncDate('fecha_solicitud'))
                .values('fecha')
                .annotate(
                    cantidad=Count('id'),
                    monto=Sum('monto')
                )
                .order_by('fecha')
            )

            # Aseguramos que monto y cantidad sean int/float para JSON
            data = []
            for s in solicitudes:
                data.append({
                    "fecha": s['fecha'].strftime("%Y-%m-%d"),
                    "cantidad": s['cantidad'],
                    "monto": float(s['monto']) if s['monto'] else 0,
                })

            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ===== Solicitudes Aprobadas View =====
@api_view(['GET'])
def exportar_reporte_excel(request):
    # Leer filtros de fecha desde query params
    fecha_inicio = request.query_params.get('fecha_inicio')
    fecha_fin = request.query_params.get('fecha_fin')

    try:
        if fecha_inicio:
            fecha_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        if fecha_fin:
            fecha_fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        return Response({"error": "Formato de fecha inválido. Use YYYY-MM-DD."}, status=400)

    # Filtrar solicitudes por rango de fecha si se especifica
    solicitudes = Solicitud.objects.all()
    if fecha_inicio:
        solicitudes = solicitudes.filter(fecha__gte=fecha_inicio)
    if fecha_fin:
        solicitudes = solicitudes.filter(fecha__lte=fecha_fin)

    # Convertir queryset a DataFrame para Excel
    data = list(solicitudes.values(
        'numero_solicitud', 'fecha', 'solicitante', 'monto', 'estado'
    ))

    if not data:
        return Response({"error": "No hay datos para el rango especificado."}, status=404)

    df = pd.DataFrame(data)

    # Crear buffer de Excel en memoria
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Solicitudes')

    buffer.seek(0)

    response = HttpResponse(
        buffer,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="reporte_solicitudes.xlsx"'

    return response

# ===== Solicitudes Aprobadas View =====
class SolicitudesPendientesView(APIView):
    def get(self, request):
        pendientes = Solicitud.objects.filter(estado='pendiente')  # o como sea tu filtro
        serializer = SolicitudSerializer(pendientes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

# ===== Estado Caja ViewSet =====
class EstadoCajaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar el estado de la caja.
    Incluye optimización de consultas y uso de caché para mejorar rendimiento.
    """
    serializer_class = EstadoCajaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Obtiene la lista de estados de caja desde caché si está disponible.
        Aplica select_related para evitar consultas N+1.
        """
        cache_key = "estado_caja_list"
        estados = cache.get(cache_key)

        if not estados:
            estados = list(
                EstadoCaja.objects.select_related("usuario")
                .only("id", "estado", "fecha_hora", "usuario__username")
                .order_by("-fecha_hora")
            )
            cache.set(cache_key, estados, timeout=60 * 5)  # Cache por 5 min
        return estados

    def perform_create(self, serializer):
        """
        Guarda un nuevo estado y limpia la caché.
        """
        serializer.save(usuario=self.request.user)
        cache.delete("estado_caja_list")
        cache.delete("estado_caja_actual")

    @action(detail=False, methods=["post"], url_path="abrir")
    def abrir_caja(self, request):
        """
        Abre la caja si no está ya abierta.
        """
        ultimo_estado = self._get_estado_actual()
        if ultimo_estado and ultimo_estado.estado == "Abierta":
            return Response(
                {"detail": "La caja ya está abierta."},
                status=status.HTTP_400_BAD_REQUEST
            )

        EstadoCaja.objects.create(estado="Abierta", usuario=request.user)
        self._clear_cache()
        return Response({"detail": "Caja abierta correctamente."})

    @action(detail=False, methods=["post"], url_path="cerrar")
    def cerrar_caja(self, request):
        """
        Cierra la caja si no está ya cerrada.
        """
        ultimo_estado = self._get_estado_actual()
        if ultimo_estado and ultimo_estado.estado == "Cerrada":
            return Response(
                {"detail": "La caja ya está cerrada."},
                status=status.HTTP_400_BAD_REQUEST
            )

        EstadoCaja.objects.create(estado="Cerrada", usuario=request.user)
        self._clear_cache()
        return Response({"detail": "Caja cerrada correctamente."})

    @action(detail=False, methods=["get"], url_path="estado")
    def estado_caja(self, request):
        """
        Devuelve el estado actual de la caja.
        Usa caché para evitar consultas innecesarias.
        """
        ultimo_estado = self._get_estado_actual()
        if ultimo_estado:
            return Response({
                "estado": ultimo_estado.estado,
                "fecha_hora": ultimo_estado.fecha_hora,
                "usuario": ultimo_estado.usuario.username if ultimo_estado.usuario else None,
            })
        return Response({
            "estado": "No registrado",
            "fecha_hora": None,
            "usuario": None,
        })

    # =============================
    # MÉTODOS PRIVADOS
    # =============================
    def _get_estado_actual(self):
        """
        Obtiene el último estado de caja desde caché o DB.
        """
        cache_key = "estado_caja_actual"
        ultimo_estado = cache.get(cache_key)

        if not ultimo_estado:
            ultimo_estado = (
                EstadoCaja.objects.select_related("usuario")
                .only("id", "estado", "fecha_hora", "usuario__username")
                .order_by("-fecha_hora")
                .first()
            )
            cache.set(cache_key, ultimo_estado, timeout=60 * 5)
        return ultimo_estado

    def _clear_cache(self):
        """
        Limpia la caché relacionada con estados de caja.
        """
        cache.delete("estado_caja_list")
        cache.delete("estado_caja_actual")
        
# ===== Notificacion ListView =====
class NotificacionListView(generics.ListAPIView):    
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user).order_by('-creado')

# ===== Notificacion ViewSet =====
class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all().order_by('-creado')
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    cache_list_key = "arqueo_caja_list"
    cache_detail_prefix = "arqueo_caja_detail_"

    def get_queryset(self):
        return self.queryset.filter(usuario=self.request.user)

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save()
        return Response({"status": "notificación marcada como leída"})

# ===== Arqueo Caja Pagination =====
class ArqueoCajaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'  # opcional, para controlar desde frontend
    max_page_size = 100

# ======= BASE CACHE MIXIN =======
class CacheInvalidateMixin:
    cache_list_key = None
    cache_detail_prefix = None

    def _invalidate_cache(self, pk=None):
        if self.cache_list_key:
            cache.delete(self.cache_list_key)
        if self.cache_detail_prefix and pk is not None:
            cache.delete(f"{self.cache_detail_prefix}{pk}")

    def perform_create(self, serializer):
        instance = serializer.save(usuario=self.request.user)
        self._invalidate_cache(pk=instance.pk)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._invalidate_cache(pk=instance.pk)

    def perform_destroy(self, instance):
        pk = instance.pk
        super().perform_destroy(instance)
        self._invalidate_cache(pk=pk)

