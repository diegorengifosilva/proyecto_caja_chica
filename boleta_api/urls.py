# boleta_project/boleta_api/urls.py

from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from boleta_api.views_frontend import FrontendAppView
from .views import (
    home,
    get_csrf_token,
    guardar_documento,
    guardar_solicitud,
    aprobar_solicitud_view,
    set_monto_diario_view,
    exportar_reporte_excel,
    arqueos_view,
    solicitudes_dashboard_view,
    solicitudes_pendientes_view,
    detalle_liquidacion_view,
    presentar_liquidacion,
    liquidaciones_pendientes_view,
    EmailTokenObtainPairView,
    RegisterView,
    SolicitudGastoHistorialViewSet,
    SolicitudGastoViewSetCRUD,
    CajaDiariaView,
    HistorialCajaDiariaView, 
    SolicitudesAprobadasView,
    ArqueoCajaViewSet,
    SolicitudList,
    NotificacionListView,
    EstadoCajaViewSet,
    GuiaSalidaViewSet,
    ActividadListView,
    SolicitudDetailView
)
from boleta_api.views_debug import tesseract_debug


# Registramos ViewSets en el router
router = DefaultRouter()
router.register(r'solicitudes', SolicitudGastoViewSetCRUD, basename="solicitud")
router.register(r'arqueos', ArqueoCajaViewSet, basename="arqueo")
router.register(r'estado_caja', EstadoCajaViewSet, basename="estado_caja")
router.register(r'guias', GuiaSalidaViewSet, basename="guia")

urlpatterns = [
    path('csrf/', get_csrf_token, name='get_csrf_token'),

    # LOGIN, REGISTER Y REFRESH
    path('login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),

    # SOLICITUD DE GASTO
    path('boleta/solicitudes/dashboard/', solicitudes_dashboard_view, name='solicitudes-dashboard'),
    path('boleta/solicitudes/guardar-solicitud/', guardar_solicitud, name='guardar_solicitud'),
    path('boleta/mis_solicitudes/', views.mis_solicitudes, name='mis_solicitudes'),
    path('boleta/mis_solicitudes/<int:solicitud_id>/', views.detalle_solicitud, name='detalle_solicitud'),
    path('boleta/mis_solicitudes/<int:solicitud_id>/estado/', views.actualizar_estado_solicitud, name='actualizar_estado_solicitud'),
    path('boleta/mis_solicitudes/<int:pk>/historial_estados/', SolicitudGastoHistorialViewSet.as_view({'get': 'historial_estados'}), name='solicitud-historial'),

    # ATENCIÓN DE SOLICITUDES
    path('boleta/solicitudes/pendientes/', solicitudes_pendientes_view, name='solicitudes_pendientes'),
    path('boleta/solicitudes/<int:pk>/', SolicitudDetailView.as_view(), name='solicitud_detalle'),

    # LIQUIDACIONES
    path('boleta/liquidaciones_pendientes/', views.liquidaciones_pendientes, name='liquidaciones_pendientes'),
    path('boleta/documentos/procesar/', views.procesar_documento, name='procesar_documento'),
    path('boleta/documentos/status/<str:task_id>/', views.estado_tarea, name='estado_tarea'),
    path('boleta/documentos/test-ocr/', views.test_ocr, name='test_ocr'),
    path('boleta/documentos/guardar/', views.guardar_documento, name='guardar_documento'),
    path('boleta/documentos/solicitud/<int:solicitud_id>/', views.obtener_documentos_por_solicitud, name='obtener_documentos_por_solicitud'),
    path('boleta/liquidaciones/presentar/', views.presentar_liquidacion, name='presentar_liquidacion'),


    # APROBACIÓN DE LIQUIDACIÓN
    path("boleta/liquidaciones_pendientes/", views.liquidaciones_pendientes_view),
    path('api/liquidaciones/<int:liquidacion_id>/detalle/', detalle_liquidacion_view, name='detalle-liquidacion'),
    path("liquidaciones/<int:liquidacion_id>/accion/", views.actualizar_estado_liquidacion, name="actualizar_estado_liquidacion"),
    
    # CAJA CHICA
    path('boleta/caja_diaria/', CajaDiariaView.as_view(), name='caja_diaria'),

    # REGISTRO DE ACTIVIDADES

    # GUÍAS DE SALIDAS

    # ESTADÍSTICAS Y REPORTES

    # EDITAR PERFIL

    # CAMBIAR CONTRASEÑA

    # DECISION
    path('boleta/solicitudes/<int:pk>/decision/', views.solicitud_decision_view, name='solicitud-decision'),

    # OTROS
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),


    path('debug/tesseract/', tesseract_debug),



    path('solicitudes/aprobar/<int:solicitud_id>/', aprobar_solicitud_view, name='aprobar-solicitud'),
    path('caja/monto-diario/', set_monto_diario_view, name='set-monto-diario'),
    path('boleta/caja_diaria/historial/', HistorialCajaDiariaView.as_view(), name='historial-caja-diaria'),
    path('boleta/solicitudes/aprobadas/', SolicitudesAprobadasView.as_view(), name='solicitudes-aprobadas'),
    path('solicitudes/exportar_excel/', exportar_reporte_excel, name='exportar_reporte_excel'),
    path('arqueos/', arqueos_view, name='arqueos'),
    path('solicitudes/lista/', SolicitudList.as_view(), name='solicitud-lista'),
    path('notificaciones/', NotificacionListView.as_view(), name='notificaciones-list'),
    path('liquidaciones-aprobacion/', views.liquidaciones_aprobacion, name='liquidaciones_aprobacion'),
    path('liquidaciones/<int:pk>/accion/', views.liquidacion_accion, name='liquidacion_accion'),
    path('registro_actividades/', ActividadListView.as_view(), name='registro_actividades'),
    path('reportes/exportar_excel/', views.exportar_reportes_excel, name='exportar_reportes_excel'),
    path('reportes/exportar_pdf/', views.exportar_reportes_pdf, name='exportar_reportes_pdf'),
    path('usuarios/actual/', views.usuario_actual, name='usuario-actual'),

    # Todas las rutas de ViewSets bajo /api/
    path('', include(router.urls)),

    # catch-all para el frontend SPA
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
]
