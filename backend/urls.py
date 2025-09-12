# boleta_project/backend/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from boleta_api.views import home

urlpatterns = [
    # Página de inicio raíz
    path('', home, name='home'),

    # Endpoints de la app boleta_api (incluye auth)
    path('api/', include('boleta_api.urls')),

    # Admin de Django
    path('admin/', admin.site.urls),
]

# Para servir archivos multimedia (imágenes OCR, etc.) en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
