# boleta_project/boleta_api/views_frontend.py
from django.views.generic import TemplateView

class FrontendAppView(TemplateView):
    template_name = "index.html"
