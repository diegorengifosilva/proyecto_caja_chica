# boleta_project\users\admin.py

from django.contrib import admin
from boleta_api.models import SegUsuario

@admin.register(SegUsuario)
class SegUsuarioAdmin(admin.ModelAdmin):
    list_display = ('usuario_usu', 'nomb_cort_usu', 'area', 'cargo', 'ban')
    search_fields = ('usuario_usu', 'nomb_cort_usu')
