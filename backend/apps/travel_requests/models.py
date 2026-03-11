"""
Modelos centrais do SAV: Solicitações de Viagem, Destinos e Autorizações.
Esta é a tabela central do sistema — todos os outros módulos referenciam travel_requests.
"""
import uuid
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import BaseModel


class Destination(BaseModel):
    """Destinos cadastrados com possibilidade de sobrescrever a diária global."""
    city = models.CharField(max_length=100, verbose_name='Cidade')
    state = models.CharField(max_length=2, blank=True, verbose_name='UF')
    country = models.CharField(max_length=100, default='Brasil', verbose_name='País')
    is_international = models.BooleanField(default=False, verbose_name='Internacional')
    # Se preenchido, sobrescreve a diária configurada globalmente para este destino
    daily_rate_override = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='Diária Específica (R$)',
    )

    class Meta:
        db_table = 'destinations'
        verbose_name = 'Destino'
        verbose_name_plural = 'Destinos'
        ordering = ['country', 'state', 'city']
        indexes = [models.Index(fields=['is_international'])]

    def __str__(self):
        if self.is_international:
            return f'{self.city} - {self.country}'
        return f'{self.city}/{self.state}'


class TravelRequestManager(models.Manager):
    """Manager com filtros frequentes para consultas de solicitações."""

    def by_employee(self):
        return self.filter(employee_type=TravelRequest.EMPLOYEE)

    def by_collaborator(self):
        return self.filter(employee_type=TravelRequest.COLLABORATOR)

    def with_embrapa_cost(self):
        return self.filter(cost_type=TravelRequest.EMBRAPA_COST)

    def without_embrapa_cost(self):
        return self.filter(cost_type=TravelRequest.NO_EMBRAPA_COST)

    def pending_approval(self):
        return self.filter(status__in=[TravelRequest.SUBMITTED, TravelRequest.UNDER_REVIEW])

    def by_requester(self, user_profile):
        return self.filter(requester=user_profile)


class TravelRequest(BaseModel):
    """
    Solicitação de Viagem — tabela central do sistema.
    Concentra todos os dados de uma viagem: quem, onde, quando, recursos necessários e status.
    """
    # --- Tipos de vínculo (desnormalizado do perfil para rastreabilidade histórica) ---
    EMPLOYEE = 'EMPLOYEE'
    COLLABORATOR = 'COLLABORATOR'
    EMPLOYEE_TYPE_CHOICES = [
        (EMPLOYEE, 'Empregado'),
        (COLLABORATOR, 'Colaborador'),
    ]

    # --- Tipos de ônus ---
    EMBRAPA_COST = 'EMBRAPA_COST'
    NO_EMBRAPA_COST = 'NO_EMBRAPA_COST'
    COST_TYPE_CHOICES = [
        (EMBRAPA_COST, 'Ônus para Embrapa'),
        (NO_EMBRAPA_COST, 'Sem Ônus para Embrapa'),
    ]

    # --- Status do fluxo de aprovação ---
    DRAFT = 'DRAFT'
    SUBMITTED = 'SUBMITTED'
    UNDER_REVIEW = 'UNDER_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    CANCELLED = 'CANCELLED'
    COMPLETED = 'COMPLETED'
    STATUS_CHOICES = [
        (DRAFT, 'Rascunho'),
        (SUBMITTED, 'Submetida'),
        (UNDER_REVIEW, 'Em Análise'),
        (APPROVED, 'Aprovada'),
        (REJECTED, 'Rejeitada'),
        (CANCELLED, 'Cancelada'),
        (COMPLETED, 'Concluída'),
    ]

    # Número sequencial gerado automaticamente via signal: SAV-2024-00001
    request_number = models.CharField(
        max_length=20, unique=True, blank=True,
        verbose_name='Número da Solicitação',
    )
    requester = models.ForeignKey(
        'users.UserProfile',
        on_delete=models.PROTECT,
        related_name='travel_requests',
        verbose_name='Solicitante',
    )

    # Classificação — desnormalizado para preservar histórico mesmo se perfil mudar
    employee_type = models.CharField(max_length=20, choices=EMPLOYEE_TYPE_CHOICES, verbose_name='Tipo de Vínculo')
    cost_type = models.CharField(max_length=20, choices=COST_TYPE_CHOICES, default=EMBRAPA_COST, verbose_name='Tipo de Ônus')

    # Dados da viagem
    origin_city = models.CharField(max_length=100, verbose_name='Cidade de Origem')
    origin_state = models.CharField(max_length=2, blank=True, verbose_name='UF de Origem')
    destination = models.ForeignKey(
        Destination,
        null=True,
        on_delete=models.PROTECT,
        related_name='travel_requests',
        verbose_name='Destino',
    )
    departure_date = models.DateField(verbose_name='Data de Saída')
    return_date = models.DateField(verbose_name='Data de Retorno')
    objective = models.TextField(verbose_name='Objetivo da Viagem')
    project_code = models.CharField(max_length=50, blank=True, verbose_name='Código do Projeto')
    funding_source = models.CharField(max_length=200, blank=True, verbose_name='Fonte de Recursos')

    # Recursos solicitados
    needs_flights = models.BooleanField(default=False, verbose_name='Solicita Passagens Aéreas')
    needs_daily_allowance = models.BooleanField(default=False, verbose_name='Solicita Diárias')
    daily_quantity = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        verbose_name='Quantidade de Diárias',
    )
    estimated_daily_total = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='Total Estimado de Diárias (R$)',
    )
    needs_accommodation = models.BooleanField(default=False, verbose_name='Necessita Hospedagem')
    accommodation_notes = models.TextField(blank=True, verbose_name='Obs. Hospedagem')
    other_expenses_description = models.TextField(blank=True, verbose_name='Outras Despesas')
    other_expenses_value = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='Valor Outras Despesas (R$)',
    )

    # Status do fluxo
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT, verbose_name='Status')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Submetida em')

    objects = TravelRequestManager()

    class Meta:
        db_table = 'travel_requests'
        verbose_name = 'Solicitação de Viagem'
        verbose_name_plural = 'Solicitações de Viagem'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['employee_type']),
            models.Index(fields=['cost_type']),
            models.Index(fields=['departure_date', 'return_date']),
            models.Index(fields=['requester']),
        ]

    def __str__(self):
        return f'{self.request_number} — {self.requester.full_name} → {self.destination}'

    @property
    def total_days(self):
        """Calcula total de dias da viagem (backend — não confiar no frontend)."""
        if self.departure_date and self.return_date:
            return (self.return_date - self.departure_date).days
        return 0

    @property
    def estimated_total_value(self):
        """Soma todos os valores estimados da solicitação."""
        from decimal import Decimal
        total = Decimal('0.00')
        if self.estimated_daily_total:
            total += self.estimated_daily_total
        if self.other_expenses_value:
            total += self.other_expenses_value
        return total

    def can_submit(self):
        """Verifica se a solicitação pode ser enviada para aprovação."""
        return self.status == self.DRAFT

    def can_cancel(self):
        """Apenas DRAFT e SUBMITTED podem ser canceladas."""
        return self.status in [self.DRAFT, self.SUBMITTED]


class TravelAuthorization(BaseModel):
    """
    Autorização eletrônica de uma solicitação de viagem.
    Cada nível de aprovação gera um registro distinto com assinatura eletrônica.
    """
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    PENDING = 'PENDING'
    DECISION_CHOICES = [
        (APPROVED, 'Aprovado'),
        (REJECTED, 'Rejeitado'),
        (PENDING, 'Pendente'),
    ]

    travel_request = models.ForeignKey(
        TravelRequest,
        on_delete=models.PROTECT,
        related_name='authorizations',
        verbose_name='Solicitação',
    )
    authorizer = models.ForeignKey(
        'users.UserProfile',
        on_delete=models.PROTECT,
        related_name='authorizations_given',
        verbose_name='Autorizador',
    )
    # Nível hierárquico: 1=supervisor, 2=gerente, 3=diretor
    authorization_level = models.IntegerField(default=1, verbose_name='Nível de Autorização')
    decision = models.CharField(max_length=10, choices=DECISION_CHOICES, default=PENDING, verbose_name='Decisão')
    justification = models.TextField(blank=True, verbose_name='Justificativa')
    # Hash SHA-256: travel_request_id + authorizer_id + timestamp + decision
    digital_signature_hash = models.CharField(max_length=255, blank=True, verbose_name='Assinatura Digital')
    authorized_at = models.DateTimeField(null=True, blank=True, verbose_name='Autorizado em')
    # Rastreabilidade de segurança
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP')
    user_agent = models.TextField(blank=True, verbose_name='User Agent')

    class Meta:
        db_table = 'travel_authorizations'
        verbose_name = 'Autorização de Viagem'
        verbose_name_plural = 'Autorizações de Viagem'
        ordering = ['-authorized_at']

    def __str__(self):
        return f'Autorização {self.decision} — {self.travel_request.request_number}'

    def generate_signature(self):
        """Gera hash SHA-256 para assinatura eletrônica da autorização."""
        import hashlib
        from django.utils import timezone
        timestamp = timezone.now().isoformat()
        raw = f"{self.travel_request_id}{self.authorizer_id}{timestamp}{self.decision}"
        self.digital_signature_hash = hashlib.sha256(raw.encode()).hexdigest()
        return self.digital_signature_hash


# --- Signal: gera request_number automaticamente ---
@receiver(post_save, sender=TravelRequest)
def generate_request_number(sender, instance, created, **kwargs):
    """
    Gera o número sequencial da solicitação no formato SAV-YYYY-NNNNN.
    Executa apenas na criação para garantir unicidade.
    """
    if created and not instance.request_number:
        from django.utils import timezone
        year = timezone.now().year
        # Conta solicitações do ano corrente para gerar sequencial
        count = TravelRequest.objects.filter(
            created_at__year=year
        ).count()
        instance.request_number = f"SAV-{year}-{count:05d}"
        TravelRequest.objects.filter(pk=instance.pk).update(
            request_number=instance.request_number
        )
