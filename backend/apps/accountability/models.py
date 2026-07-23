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

    # Adiantamento efetivamente recebido pelo favorecido (diárias + outros)
    advance_received = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Adiantamento Realizado (R$)',
    )

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
    # Nota de Empenho da PCV (melhoria — não existe no SDP); informada pelo SOF
    commitment_number = models.CharField(max_length=20, blank=True, verbose_name='Nota de Empenho (PCV)')

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

    # ─── Totais da PCV (modelo SDP) ─────────────────────────────────────────
    @property
    def total_diarias(self) -> Decimal:
        """Total de diárias da viagem (diárias × valor, dos favorecidos)."""
        total = Decimal('0.00')
        for b in self.travel_request.beneficiaries.all():
            total += (b.daily_quantity or Decimal('0')) * (b.daily_rate or Decimal('0'))
        return total

    @property
    def total_despesas_aprovadas(self) -> Decimal:
        """Soma dos valores APROVADOS das despesas comprovadas."""
        return sum(
            (i.approved_value or Decimal('0.00') for i in self.expense_items.all()),
            Decimal('0.00'),
        )

    @property
    def valor_total_viagem(self) -> Decimal:
        """Valor Total da Viagem = Total de Diárias + Despesas Aprovadas."""
        return self.total_diarias + self.total_despesas_aprovadas

    @property
    def valor_a_devolver(self) -> Decimal:
        """Adiantamento recebido a mais em relação ao total (devolver à Embrapa)."""
        diff = (self.advance_received or Decimal('0.00')) - self.valor_total_viagem
        return diff if diff > 0 else Decimal('0.00')

    @property
    def valor_a_receber(self) -> Decimal:
        """Total maior que o adiantamento (a receber da Embrapa)."""
        diff = self.valor_total_viagem - (self.advance_received or Decimal('0.00'))
        return diff if diff > 0 else Decimal('0.00')


class ExpenseItem(BaseModel):
    """
    Comprovação de Despesa da PCV (modelo SDP): tipo, descrição, valor comprovado
    (informado pelo favorecido) e valor aprovado (ajustado pelo SOF na análise).
    """

    class ItemType(models.TextChoices):
        LODGING = 'LODGING', 'Hospedagem'
        TICKETS = 'TICKETS', 'Passagens'
        TAXI = 'TAXI', 'Táxi'
        TOLL_PARKING = 'TOLL_PARKING', 'Pedágio / Estacionamento'
        SERVICES = 'SERVICES', 'Serviços'
        FUEL = 'FUEL', 'Combustível'
        OTHER = 'OTHER', 'Outros'

    report = models.ForeignKey(
        AccountabilityReport, on_delete=models.CASCADE,
        related_name='expense_items', verbose_name='Prestação de Contas',
    )
    item_type = models.CharField(max_length=20, choices=ItemType.choices, verbose_name='Tipo')
    description = models.CharField(max_length=255, verbose_name='Descrição')
    proven_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Comprovado (R$)',
    )
    approved_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        verbose_name='Aprovado (R$)',
    )

    class Meta:
        db_table = 'accountability_expense_items'
        verbose_name = 'Comprovação de Despesa'
        verbose_name_plural = 'Comprovações de Despesa'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.get_item_type_display()} — {self.proven_value}'


class AccountabilityRouting(BaseModel):
    """
    Histórico de Encaminhamento da PCV (modelo SDP): cada fase do processo com
    natureza (o que aconteceu), usuário responsável, data e justificativa.
    """
    report = models.ForeignKey(
        AccountabilityReport, on_delete=models.CASCADE,
        related_name='routings', verbose_name='Prestação de Contas',
    )
    action = models.CharField(max_length=150, verbose_name='Natureza')
    responsible = models.ForeignKey(
        'users.UserProfile', null=True, on_delete=models.SET_NULL,
        related_name='pcv_routings', verbose_name='Usuário Responsável',
    )
    note = models.TextField(blank=True, verbose_name='Justificativa')

    class Meta:
        db_table = 'accountability_routings'
        verbose_name = 'Encaminhamento da PCV'
        verbose_name_plural = 'Histórico de Encaminhamento'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.action} — {self.report.travel_request.request_number}'
