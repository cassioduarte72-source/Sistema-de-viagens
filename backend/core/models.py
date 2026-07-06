"""
core/models.py — Modelos base compartilhados por todo o sistema.

BaseModel: UUID como chave primária + timestamps automáticos.
SystemConfig: parâmetros de negócio configuráveis sem deploy (taxas de diária, prazos).
"""
import uuid
from django.db import models


class BaseModel(models.Model):
    """Modelo abstrato base: UUID, criação e atualização automáticas."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')

    class Meta:
        abstract = True


class SystemConfig(BaseModel):
    """
    Configurações do sistema editáveis pelo ADMIN (via admin ou API futura).
    Ex.: DAILY_RATE_NATIONAL, DAILY_RATE_INTERNATIONAL, MIN_ADVANCE_DAYS.
    """
    config_key = models.CharField(max_length=100, unique=True, verbose_name='Chave')
    config_value = models.CharField(max_length=255, verbose_name='Valor')
    description = models.CharField(max_length=255, blank=True, verbose_name='Descrição')

    class Meta:
        db_table = 'system_config'
        verbose_name = 'Configuração do Sistema'
        verbose_name_plural = 'Configurações do Sistema'
        ordering = ['config_key']

    def __str__(self):
        return f'{self.config_key} = {self.config_value}'

    @classmethod
    def get_value(cls, key: str, default: str = None) -> str:
        """Busca o valor de uma configuração; retorna default se não existir."""
        try:
            return cls.objects.get(config_key=key).config_value
        except cls.DoesNotExist:
            return default
