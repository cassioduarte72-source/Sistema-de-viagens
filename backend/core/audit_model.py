"""
core/audit_model.py — Registro de auditoria imutável.
Regra: apenas INSERT. Nunca expor endpoints de UPDATE/DELETE para esta tabela.
"""
from django.db import models
from core.models import BaseModel


class AuditLog(BaseModel):
    """Log imutável de ações críticas (criação, mudança de status, aprovações)."""
    ACTION_CHOICES = [
        ('CREATE', 'Criação'),
        ('UPDATE', 'Atualização'),
        ('STATUS_CHANGE', 'Mudança de Status'),
        ('APPROVE', 'Aprovação'),
        ('REJECT', 'Rejeição'),
        ('CANCEL', 'Cancelamento'),
        ('DELETE', 'Exclusão'),
    ]

    table_name = models.CharField(max_length=100, verbose_name='Tabela')
    record_id = models.CharField(max_length=64, verbose_name='ID do Registro')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name='Ação')
    old_values = models.JSONField(null=True, blank=True, verbose_name='Valores Anteriores')
    new_values = models.JSONField(null=True, blank=True, verbose_name='Valores Novos')
    performed_by = models.ForeignKey(
        'users.UserProfile', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='audit_entries',
        verbose_name='Executado por',
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP')

    class Meta:
        db_table = 'audit_log'
        verbose_name = 'Registro de Auditoria'
        verbose_name_plural = 'Registros de Auditoria'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['table_name', 'record_id']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f'[{self.created_at:%d/%m/%Y %H:%M}] {self.action} em {self.table_name}#{self.record_id}'
