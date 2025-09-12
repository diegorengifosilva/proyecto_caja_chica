# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EstadoCaja, Notificacion, User

@receiver(post_save, sender=EstadoCaja)
def crear_notificacion_cierre_caja(sender, instance, created, **kwargs):
    if not created and instance.estado == 'cerrada':
        mensaje = f"La caja fue cerrada por {instance.usuario.username} el {instance.fecha_hora.strftime('%Y-%m-%d %H:%M:%S')}."
        # Aquí decides a quién enviar: responsables o todos. Ejemplo simple:
        responsables = User.objects.filter(is_staff=True)  # O el filtro que uses
        for usuario in responsables:
            Notificacion.objects.create(usuario=usuario, mensaje=mensaje)
