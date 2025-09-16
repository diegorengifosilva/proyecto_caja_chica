# boleta_project/backend/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from boleta_api.views_frontend import FrontendAppView

urlpatterns = [
    # Endpoints de la API
    path('api/', include('boleta_api.urls')),

    # Admin de Django
    path('admin/', admin.site.urls),

    # Catch-all para React SPA
    re_path(r'^.*$', FrontendAppView.as_view(), name='frontend'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
