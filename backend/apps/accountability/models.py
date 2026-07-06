"""
apps/accountability/models.py — Prestação de contas de viagem.

Herda todos os dados da solicitação original (SV): o viajante informa apenas
datas efetivas e valores gastos. O sistema calcula automaticamente o saldo
(devolução ou complementação) — eliminando a redigitação do processo atual.
"""
from decimal import Decimal
from django.db import models
from core.models import BaseModel


class AccountabilityReport(BaseModel):
    """Prestação de contas vinculada 1:1 a uma solicitação de viagem."""

    class StatusChoices(models.TextChoices):
        DRAFT = 'DRAFT', 'Rascunho'
        SUBMITTED = 'SUBMITTED', 'Enviada'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Em Análise (SOF)'
        APPROVED = 'APPROVED', 'Atestada'
        CLOSED = 'CLOSED', 'Encerrada'

    travel_request = models.OneToOneField(
        'travel_requests.TravelRequest',
        on_delete=models.PROTECT,
        related_name='accountability_report',
        verbose_name='Solicitação de Viagem',
    )
    submitted_by = models.ForeignKey(
        'users.UserProfile',
        on_delete=models.PROTECT,
        related_name='accountability_reports',
        verbose_name='Enviada por',
    )

    # Datas efetivas da viagem (podem divergir das previstas na SV)
    actual_departure_date = models.DateField(null=True, blank=True, verbose_name='Saída Efetiva')
    actual_return_date = models.DateField(null=True, blank=True, verbose_name='Retorno Efetivo')

    # Valores
    total_daily_received = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Total de Diárias Recebido (R$)',
    )
    total_daily_spent = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Total de Diárias Devido (R$)',
    )
    other_expenses = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Outras Despesas Comprovadas (R$)',
    )

    trip_report = models.TextField(blank=True, verbose_name='Relatório de Viagem')
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices,
        default=StatusChoices.DRAFT, verbose_name='Status',
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Enviada em')
    reviewed_by = models.ForeignKey(
        'users.UserProfile', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='accountability_reviews',
        verbose_name='Analisada por (SOF)',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='Analisada em')
    review_notes = models.TextField(blank=True, verbose_name='Observações da Análise')

    class Meta:
        db_table = 'accountability_reports'
        verbose_name = 'Prestação de Contas'
        verbose_name_plural = 'Prestações de Contas'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status'])]

    def __str__(self):
        return f'PC — {self.travel_request.request_number}'

    # ─── Cálculo automático de saldo ────────────────────────────────────────
    @property
    def balance(self) -> Decimal:
        """
        Saldo = recebido - devido.
        Positivo: viajante deve devolver (GRU). Negativo: Embrapa complementa.
        """
        return (self.total_daily_received or Decimal('0.00')) - (
            self.total_daily_spent or Decimal('0.00')
        )

    @property
    def requires_refund(self) -> bool:
        """True quando o viajante recebeu mais do que o devido (deve devolver)."""
        return self.balance > 0

    @property
    def requires_complement(self) -> bool:
        """True quando o viajante recebeu menos do que o devido (Embrapa complementa)."""
        return self.balance < 0
