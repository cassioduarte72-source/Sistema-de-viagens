"""
Sistema de auditoria imutável via signals do Django.
Registra toda criação, edição e mudança de status na tabela audit_log.
SEGURANÇA: a tabela audit_log não possui permissão de UPDATE/DELETE — apenas INSERT.
"""
import json
from django.db import models
from django.utils import timezone


def serialize_value(value):
    """Serializa valores para armazenamento em JSONB."""
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    return value


import uuid
from django.contrib.contenttypes.models import ContentType


def log_audit(instance, action, old_values=None, new_values=None, request=None):
    """
    Cria um registro de auditoria para a ação realizada.
    Chamado via signals em mudanças críticas de status.
    """
    from apps.users.models import UserProfile  # import tardio para evitar circular

    # Identifica quem realizou a ação (via request middleware ou thread local)
    performed_by = None
    ip_address = None

    if request and hasattr(request, 'user') and request.user.is_authenticated:
        try:
            performed_by = request.user.userprofile
        except Exception:
            pass
        ip_address = request.META.get('REMOTE_ADDR')

    # Cria o registro de auditoria (importação local para evitar circular)
    from core.audit_model import AuditLog
    AuditLog.objects.create(
        table_name=instance._meta.db_table,
        record_id=str(instance.pk),
        action=action,
        old_values=old_values,
        new_values=new_values,
        performed_by=performed_by,
        ip_address=ip_address,
    )
