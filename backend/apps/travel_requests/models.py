"""
Modelos centrais do SAV: Solicitações de Viagem, Destinos e Autorizações.
Esta é a tabela central do sistema — todos os outros módulos referenciam travel_requests.
"""
from django.db import models, transaction, IntegrityError
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
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
        return self.filter(employee_type=TravelRequest.EmployeeType.EMPLOYEE)

    def by_collaborator(self):
        return self.filter(employee_type=TravelRequest.EmployeeType.COLLABORATOR)

    def with_embrapa_cost(self):
        return self.filter(cost_type=TravelRequest.CostType.EMBRAPA_COST)

    def without_embrapa_cost(self):
        return self.filter(cost_type=TravelRequest.CostType.NO_EMBRAPA_COST)

    def pending_approval(self):
        return self.filter(status__in=[
            TravelRequest.StatusChoices.SUBMITTED,
            TravelRequest.StatusChoices.UNDER_REVIEW,
        ])

    def by_requester(self, user_profile):
        return self.filter(requester=user_profile)


class TravelRequest(BaseModel):
    """
    Solicitação de Viagem — tabela central do sistema.
    Concentra todos os dados de uma viagem: quem, onde, quando, recursos necessários e status.
    """

    class EmployeeType(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Empregado'
        COLLABORATOR = 'COLLABORATOR', 'Colaborador'

    class CostType(models.TextChoices):
        # Passo 1 do wizard (fonte de recurso) — paridade SAGU
        NO_COST_LOCAL = 'NO_COST_LOCAL', 'Sem custo — dentro do município'
        EMBRAPA_COST = 'EMBRAPA_COST', 'Com Ônus para Embrapa'
        NO_ONUS = 'NO_ONUS', 'Sem Ônus para Embrapa'
        EXTERNAL_PROJECT = 'EXTERNAL_PROJECT', 'Sem ônus da Embrapa — projeto externo'
        SPONSOR = 'SPONSOR', 'Sem ônus da Embrapa — patrocinador'
        # Legado (compatibilidade com registros antigos)
        NO_EMBRAPA_COST = 'NO_EMBRAPA_COST', 'Sem Ônus para Embrapa (legado)'

    class TripType(models.TextChoices):
        CARGO_OUT = 'CARGO_OUT', 'Transporte de carga fora do município'
        PRIVATE_VEHICLE = 'PRIVATE_VEHICLE', 'Transporte de pessoas com veículo particular'
        RENTED_OR_TAXI = 'RENTED_OR_TAXI', 'Transporte de pessoas com veículo locado ou táxi'
        EMBRAPA_WITH_SLT = 'EMBRAPA_WITH_SLT', 'Veículo da Embrapa com motorista do SLT'
        EMBRAPA_NO_SLT = 'EMBRAPA_NO_SLT', 'Veículo da Embrapa sem motorista do SLT'
        AIR = 'AIR', 'Viagem aérea'

    # Textos de orientação exibidos no wizard (passo 2), como no SAGU
    TRIP_TYPE_HELP = {
        'CARGO_OUT': 'Use para deslocamento de materiais, insumos ou equipamentos para fora do município.',
        'PRIVATE_VEHICLE': 'Use quando o deslocamento será feito em veículo particular do empregado (indenização de transporte).',
        'RENTED_OR_TAXI': 'Use para deslocamentos em veículo locado, táxi ou transporte por aplicativo.',
        'EMBRAPA_WITH_SLT': 'Use quando o veículo oficial será conduzido por motorista do serviço de transporte contratado (SLT).',
        'EMBRAPA_NO_SLT': 'Use quando o próprio empregado conduzirá o veículo oficial da Embrapa.',
        'AIR': 'Use para deslocamentos por via aérea. Antecedência inferior ao prazo regulamentar exige justificativa de excepcionalidade.',
    }

    class StatusChoices(models.TextChoices):
        DRAFT = 'DRAFT', 'Rascunho'
        SUBMITTED = 'SUBMITTED', 'Submetida'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Em Análise'
        APPROVED = 'APPROVED', 'Aprovada'
        REJECTED = 'REJECTED', 'Rejeitada'
        CANCELLED = 'CANCELLED', 'Cancelada'
        COMPLETED = 'COMPLETED', 'Concluída'

    # --- Aliases legados (compatibilidade com código que usa constantes planas) ---
    EMPLOYEE = EmployeeType.EMPLOYEE
    COLLABORATOR = EmployeeType.COLLABORATOR
    EMBRAPA_COST = CostType.EMBRAPA_COST
    NO_EMBRAPA_COST = CostType.NO_EMBRAPA_COST
    DRAFT = StatusChoices.DRAFT
    SUBMITTED = StatusChoices.SUBMITTED
    UNDER_REVIEW = StatusChoices.UNDER_REVIEW
    APPROVED = StatusChoices.APPROVED
    REJECTED = StatusChoices.REJECTED
    CANCELLED = StatusChoices.CANCELLED
    COMPLETED = StatusChoices.COMPLETED

    # Número sequencial gerado automaticamente via signal: SAV-2026-00001
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
    employee_type = models.CharField(max_length=20, choices=EmployeeType.choices, verbose_name='Tipo de Vínculo')
    cost_type = models.CharField(max_length=20, choices=CostType.choices, default=CostType.EMBRAPA_COST, verbose_name='Tipo de Ônus')

    class TransportMeans(models.TextChoices):
        AIR = 'AIR', 'Aéreo'
        AIR_ROAD = 'AIR_ROAD', 'Aéreo/Rodoviário'
        RIVER = 'RIVER', 'Fluvial'
        RIVER_ROAD = 'RIVER_ROAD', 'Fluvial/Rodoviário'
        ROAD = 'ROAD', 'Rodoviário'

    # Meio de transporte (campo "Meio de Transporte" do SDP)
    transport_means = models.CharField(
        max_length=20, choices=TransportMeans.choices, blank=True,
        verbose_name='Meio de Transporte',
    )

    # Dados da viagem
    origin_city = models.CharField(max_length=100, verbose_name='Cidade de Origem')
    origin_state = models.CharField(max_length=2, blank=True, verbose_name='UF de Origem')
    itinerary = models.CharField(
        max_length=255, blank=True, verbose_name='Roteiro',
        help_text='Ex.: Cruz das Almas - Salvador - Brasília',
    )
    observations = models.TextField(blank=True, verbose_name='Observações')
    destination = models.ForeignKey(
        Destination,
        null=True,
        on_delete=models.PROTECT,
        related_name='travel_requests',
        verbose_name='Destino',
    )
    departure_date = models.DateField(verbose_name='Data de Saída')
    departure_time = models.TimeField(null=True, blank=True, verbose_name='Hora de Saída')
    return_date = models.DateField(verbose_name='Data de Retorno')
    return_time = models.TimeField(null=True, blank=True, verbose_name='Hora de Retorno')
    objective = models.TextField(verbose_name='Objetivo da Viagem')
    project_code = models.CharField(max_length=50, blank=True, verbose_name='Código do Projeto')
    funding_source = models.CharField(max_length=200, blank=True, verbose_name='Fonte de Recursos')
    modality = models.CharField(
        max_length=255, blank=True, verbose_name='Modalidade',
        help_text='Ex.: Transporte de pessoas fora do município com veículo da Embrapa e sem motorista do SLT',
    )
    project = models.ForeignKey(
        'ResearchProject', null=True, blank=True,
        on_delete=models.PROTECT, related_name='travel_requests',
        verbose_name='Projeto (Recurso)',
    )
    trip_type = models.CharField(
        max_length=20, choices=TripType.choices, blank=True,
        verbose_name='Tipo de Viagem',
    )
    resource_line = models.ForeignKey(
        'ResourceLine', null=True, blank=True,
        on_delete=models.PROTECT, related_name='travel_requests',
        verbose_name='Linha de Recurso',
    )
    research_activity = models.ForeignKey(
        'ResearchActivity', null=True, blank=True,
        on_delete=models.PROTECT, related_name='travel_requests',
        verbose_name='Atividade (Fonte de Recurso)',
    )
    sponsor = models.ForeignKey(
        'Sponsor', null=True, blank=True,
        on_delete=models.PROTECT, related_name='travel_requests',
        verbose_name='Patrocinador',
    )
    exceptionality_justification = models.TextField(
        blank=True, verbose_name='Justificativa de Excepcionalidade',
        help_text='Obrigatória para viagem aérea solicitada com menos de 17 dias de antecedência.',
    )

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
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.DRAFT, verbose_name='Status')
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='Submetida em')
    # Número do processo SEI informado pelo SLT (NNNNN.NNNNNN/AAAA-NN)
    sei_process = models.CharField(max_length=25, blank=True, verbose_name='Processo SEI')
    # Empenho e valor informados pelo SOF (empenho: AAAANE + 6 dígitos, ex.: 2026NE000121)
    commitment_number = models.CharField(max_length=20, blank=True, verbose_name='Nota de Empenho')
    committed_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name='Valor Empenhado (R$)',
    )

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

    # ─── Propriedades calculadas ────────────────────────────────────────────
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

    @property
    def can_be_submitted(self) -> bool:
        """Apenas rascunhos podem ser enviados para aprovação."""
        return self.status == self.StatusChoices.DRAFT

    @property
    def can_be_edited(self) -> bool:
        """Apenas rascunhos podem ser editados."""
        return self.status == self.StatusChoices.DRAFT

    @property
    def can_be_cancelled(self) -> bool:
        """Apenas DRAFT e SUBMITTED podem ser canceladas."""
        return self.status in (self.StatusChoices.DRAFT, self.StatusChoices.SUBMITTED)

    # ─── Transições de status ───────────────────────────────────────────────
    def submit(self):
        """Transição DRAFT → SUBMITTED, com registro do momento do envio."""
        if not self.can_be_submitted:
            raise ValueError('Solicitação não pode ser enviada no estado atual.')
        self.status = self.StatusChoices.SUBMITTED
        self.submitted_at = timezone.now()
        self.save(update_fields=['status', 'submitted_at', 'updated_at'])
        return self

    def cancel(self):
        """Cancela a solicitação (apenas DRAFT/SUBMITTED)."""
        if not self.can_be_cancelled:
            raise ValueError(
                f'Solicitação com status {self.get_status_display()} não pode ser cancelada.'
            )
        self.status = self.StatusChoices.CANCELLED
        self.save(update_fields=['status', 'updated_at'])
        return self

    # ─── Máquina de estados (paridade SAGU: Solicitada, Em análise, Aprovada,
    #     Não atendida, Cancelada, Finalizada) ─────────────────────────────────
    ALLOWED_TRANSITIONS = {
        'DRAFT': ['SUBMITTED', 'CANCELLED'],
        # Fluxo atual (SAV como módulo do SAGU): vai direto ao SLT, que ao
        # lançar no SDP marca como Finalizada (SUBMITTED → COMPLETED).
        'SUBMITTED': ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
        'UNDER_REVIEW': ['APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'],
        'APPROVED': ['COMPLETED', 'CANCELLED'],
        'REJECTED': [],
        'CANCELLED': [],
        'COMPLETED': [],
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])

    def change_status(self, new_status, changed_by=None, observation=''):
        """Transição controlada com registro no histórico (StatusChange)."""
        if not self.can_transition_to(new_status):
            raise ValueError(
                f'Transição inválida: {self.status} → {new_status}.'
            )
        old = self.status
        self.status = new_status
        if new_status == self.StatusChoices.SUBMITTED and not self.submitted_at:
            self.submitted_at = timezone.now()
        self.save(update_fields=['status', 'submitted_at', 'updated_at'])
        return StatusChange.objects.create(
            travel_request=self, from_status=old, to_status=new_status,
            observation=observation, changed_by=changed_by,
        )

    @property
    def total_beneficiaries_value(self):
        """Total geral da viagem: soma dos totais de todos os favorecidos."""
        from decimal import Decimal
        return sum((b.total_value for b in self.beneficiaries.all()), Decimal('0.00'))

    # ─── Numeração sequencial ───────────────────────────────────────────────
    def _generate_request_number(self) -> str:
        """
        Gera e persiste o próximo número sequencial do ano: SAV-AAAA-NNNNN.

        Seguro contra concorrência: baseia-se no MAIOR número já existente
        (não em count(), que gera duplicatas sob concorrência e após exclusões)
        dentro de uma transação; a constraint unique é a defesa final.
        """
        year = timezone.now().year
        prefix = f'SAV-{year}-'
        for _ in range(5):  # retentativas em caso de colisão concorrente
            with transaction.atomic():
                last = (
                    TravelRequest.objects
                    .filter(request_number__startswith=prefix)
                    .order_by('-request_number')
                    .values_list('request_number', flat=True)
                    .first()
                )
                next_seq = int(last.rsplit('-', 1)[1]) + 1 if last else 1
                number = f'{prefix}{next_seq:05d}'
                try:
                    TravelRequest.objects.filter(pk=self.pk).update(request_number=number)
                    self.request_number = number
                    return number
                except IntegrityError:
                    continue  # outro processo pegou o número; tenta o próximo
        raise IntegrityError('Não foi possível gerar número único para a solicitação.')


class TravelAuthorization(BaseModel):
    """
    Autorização eletrônica de uma solicitação de viagem.
    Cada nível de aprovação gera um registro distinto com assinatura eletrônica.
    """

    class DecisionChoices(models.TextChoices):
        APPROVED = 'APPROVED', 'Aprovado'
        REJECTED = 'REJECTED', 'Rejeitado'
        PENDING = 'PENDING', 'Pendente'

    # Aliases legados
    APPROVED = DecisionChoices.APPROVED
    REJECTED = DecisionChoices.REJECTED
    PENDING = DecisionChoices.PENDING

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
    decision = models.CharField(max_length=10, choices=DecisionChoices.choices, default=DecisionChoices.PENDING, verbose_name='Decisão')
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
        timestamp = timezone.now().isoformat()
        raw = f"{self.travel_request_id}{self.authorizer_id}{timestamp}{self.decision}"
        self.digital_signature_hash = hashlib.sha256(raw.encode()).hexdigest()
        return self.digital_signature_hash


# --- Signal: gera request_number automaticamente na criação ---
@receiver(post_save, sender=TravelRequest)
def generate_request_number(sender, instance, created, **kwargs):
    """Atribui o número sequencial SAV-AAAA-NNNNN a novas solicitações."""
    if created and not instance.request_number:
        instance._generate_request_number()


# ═══════════════════════════════════════════════════════════════════════════
# Paridade com o módulo Viagens do SAGU
# (múltiplos favorecidos, recurso/projeto, bloco financeiro, SEI, workflow)
# ═══════════════════════════════════════════════════════════════════════════

class FundingAgency(BaseModel):
    """Agências de fomento à pesquisa (CNPq, FAPESP, FAPESB, Fundecitrus…) —
    equivalente ao cadastro 'Agências' do SAGU, usado como fonte financiadora."""
    name = models.CharField(max_length=200, verbose_name='Nome')
    acronym = models.CharField(max_length=30, blank=True, verbose_name='Sigla')
    active = models.BooleanField(default=True, verbose_name='Ativa')

    class Meta:
        db_table = 'funding_agencies'
        verbose_name = 'Agência de Fomento'
        verbose_name_plural = 'Agências de Fomento'
        ordering = ['name']

    def __str__(self):
        return self.acronym or self.name


class ResearchProject(BaseModel):
    """Bloco 'Recurso' do SAGU: projeto de pesquisa que financia a viagem."""
    number = models.CharField(max_length=50, unique=True, verbose_name='Número do Projeto')
    name = models.CharField(max_length=255, verbose_name='Nome do Projeto')
    responsible = models.CharField(max_length=200, blank=True, verbose_name='Responsável')
    is_external = models.BooleanField(default=False, verbose_name='Projeto Externo')
    funding_agency = models.ForeignKey(
        FundingAgency, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='projects',
        verbose_name='Agência Financiadora',
    )
    active = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        db_table = 'research_projects'
        verbose_name = 'Projeto de Pesquisa'
        verbose_name_plural = 'Projetos de Pesquisa'
        ordering = ['number']

    def __str__(self):
        return f'{self.number} — {self.name}'


class ResearchActivity(BaseModel):
    """
    Atividade de pesquisa / Plano de Ação (tela 'Atividades' do SAGU):
    número, título, responsável, vigência (início/término) e saldo disponível.
    Quando a viagem é 'Com Ônus', o solicitante escolhe uma de suas atividades
    (aquelas em que é o responsável) como fonte de recurso.
    """
    code = models.CharField(max_length=40, unique=True, verbose_name='Número (Plano de Ação)')
    description = models.CharField(max_length=500, verbose_name='Título da Atividade')
    responsible = models.CharField(max_length=200, blank=True, verbose_name='Responsável')
    start_date = models.DateField(null=True, blank=True, verbose_name='Início')
    end_date = models.DateField(null=True, blank=True, verbose_name='Término')
    balance = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        verbose_name='Saldo (R$)',
    )
    active = models.BooleanField(default=True, verbose_name='Ativa')

    class Meta:
        db_table = 'research_activities'
        verbose_name = 'Atividade de Pesquisa'
        verbose_name_plural = 'Atividades de Pesquisa'
        ordering = ['code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['responsible']),
        ]

    def __str__(self):
        return f'{self.code} — {self.description[:60]}'


class TravelBeneficiary(BaseModel):
    """
    Favorecido de uma viagem (bloco 'Favorecidos' do SAGU).
    Relação 1:N — uma viagem pode ter vários favorecidos, cada um com
    período, cidade, diárias fracionadas, hotel, adicionais e processo SEI próprios.
    """

    class BeneficiaryType(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Empregado'
        COLLABORATOR = 'COLLABORATOR', 'Colaborador'
        RELEASED = 'RELEASED', 'Liberado'
        SPONSORED = 'SPONSORED', 'Patrocinado'
        EXTERNAL = 'EXTERNAL', 'Externo'

    travel_request = models.ForeignKey(
        TravelRequest, on_delete=models.CASCADE,
        related_name='beneficiaries', verbose_name='Viagem',
    )
    beneficiary_type = models.CharField(
        max_length=20, choices=BeneficiaryType.choices,
        default=BeneficiaryType.EMPLOYEE, verbose_name='Tipo de Favorecido',
    )
    # Perfil interno (quando empregado) OU nome livre (colaborador/externo)
    profile = models.ForeignKey(
        'users.UserProfile', null=True, blank=True,
        on_delete=models.PROTECT, related_name='benefited_travels',
        verbose_name='Perfil (interno)',
    )
    full_name = models.CharField(max_length=200, verbose_name='Nome Completo')
    # Dados do favorecido copiados do cadastro (SAGU) no momento da solicitação —
    # preservam o documento (AV/PCV) mesmo se o cadastro mudar depois.
    registration_number = models.CharField(max_length=30, blank=True, verbose_name='Matrícula')
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    email = models.EmailField(blank=True, verbose_name='E-mail')
    position = models.CharField(max_length=120, blank=True, verbose_name='Cargo')
    bank_info = models.CharField(max_length=120, blank=True, verbose_name='Dados Bancários')

    start_date = models.DateField(verbose_name='Início do Período')
    end_date = models.DateField(verbose_name='Fim do Período')
    city = models.CharField(max_length=120, blank=True, verbose_name='Cidade')

    daily_quantity = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name='Qtde. Diárias',
    )
    daily_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='Valor da Diária (R$)',
    )
    hotel_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='Hotel (R$)',
    )
    additional_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        verbose_name='Adicionais (R$)',
    )
    # Nº do processo SEI do favorecido: NNNNN.NNNNNN/NNNN-NN
    sei_process = models.CharField(
        max_length=25, blank=True, verbose_name='Processo SEI',
    )

    class Meta:
        db_table = 'travel_beneficiaries'
        verbose_name = 'Favorecido'
        verbose_name_plural = 'Favorecidos'
        ordering = ['full_name']

    def __str__(self):
        return f'{self.full_name} — {self.travel_request.request_number}'

    @property
    def total_value(self):
        """Total por favorecido = (diárias × valor) + hotel + adicionais."""
        from decimal import Decimal
        return (
            (self.daily_quantity or Decimal('0')) * (self.daily_rate or Decimal('0'))
            + (self.hotel_value or Decimal('0'))
            + (self.additional_value or Decimal('0'))
        )


class BudgetAllocation(BaseModel):
    """
    Bloco 'Financeiro' do SAGU, por favorecido: classificação orçamentária
    completa (SIAFI/PCASP) e número do empenho. Preenchido pelo SOF.
    """
    beneficiary = models.OneToOneField(
        TravelBeneficiary, on_delete=models.CASCADE,
        related_name='budget', verbose_name='Favorecido',
    )
    expense_element = models.CharField(
        max_length=20, verbose_name='Elemento de Despesa',
        help_text='Ex.: 339014.14 — Diárias no País',
    )
    ugr = models.CharField(max_length=12, blank=True, verbose_name='UGR')
    funding_source = models.CharField(max_length=20, blank=True, verbose_name='Fonte')
    ptres = models.CharField(max_length=12, blank=True, verbose_name='PTRES')
    pi = models.CharField(max_length=30, blank=True, verbose_name='PI (Plano Interno)')
    commitment_number = models.CharField(
        max_length=30, blank=True, verbose_name='Nota de Empenho',
        help_text='Ex.: 2026NE000123',
    )
    adjusted_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='Valor Ajustado (R$)',
    )

    class Meta:
        db_table = 'budget_allocations'
        verbose_name = 'Dotação Orçamentária'
        verbose_name_plural = 'Dotações Orçamentárias'

    def __str__(self):
        return f'{self.expense_element} — {self.beneficiary.full_name}'


class StatusChange(BaseModel):
    """
    Histórico de mudanças de status (tela 'Alterar Status' do SAGU),
    com observação e registro de envio de e-mail.
    """
    travel_request = models.ForeignKey(
        TravelRequest, on_delete=models.CASCADE,
        related_name='status_changes', verbose_name='Viagem',
    )
    from_status = models.CharField(max_length=20, verbose_name='De')
    to_status = models.CharField(max_length=20, verbose_name='Para')
    observation = models.TextField(blank=True, verbose_name='Observação')
    changed_by = models.ForeignKey(
        'users.UserProfile', null=True,
        on_delete=models.SET_NULL, related_name='status_changes_made',
        verbose_name='Alterado por',
    )
    email_sent = models.BooleanField(default=False, verbose_name='E-mail Enviado')

    class Meta:
        db_table = 'travel_status_changes'
        verbose_name = 'Mudança de Status'
        verbose_name_plural = 'Mudanças de Status'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.travel_request.request_number}: {self.from_status} → {self.to_status}'


# ═══════════════════════════════════════════════════════════════════════════
# Wizard do solicitante (portal 'Minhas Viagens' do SAGU)
# ═══════════════════════════════════════════════════════════════════════════

class Sponsor(BaseModel):
    """Cadastro 'Patrocinadores' do SAGU — custeia viagens sem ônus para a Embrapa."""
    name = models.CharField(max_length=200, verbose_name='Nome')
    document = models.CharField(max_length=20, blank=True, verbose_name='CNPJ/CPF')
    active = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        db_table = 'sponsors'
        verbose_name = 'Patrocinador'
        verbose_name_plural = 'Patrocinadores'
        ordering = ['name']

    def __str__(self):
        return self.name


class ResourceLine(BaseModel):
    """
    Linha orçamentária do passo 2 do wizard ('Recurso'):
    despesas fixas, tributos, eventos, reserva, investimentos,
    sentenças judiciais, restos a pagar.
    """
    name = models.CharField(max_length=100, unique=True, verbose_name='Nome')
    active = models.BooleanField(default=True, verbose_name='Ativa')

    class Meta:
        db_table = 'resource_lines'
        verbose_name = 'Linha de Recurso'
        verbose_name_plural = 'Linhas de Recurso'
        ordering = ['name']

    def __str__(self):
        return self.name


class FlightTicket(BaseModel):
    """
    Seção 'Passagens' do wizard (viagem aérea) — separada das diárias,
    vinculada opcionalmente a um favorecido específico.
    """
    travel_request = models.ForeignKey(
        TravelRequest, on_delete=models.CASCADE,
        related_name='tickets', verbose_name='Viagem',
    )
    beneficiary = models.ForeignKey(
        'TravelBeneficiary', null=True, blank=True,
        on_delete=models.CASCADE, related_name='tickets',
        verbose_name='Favorecido',
    )
    origin = models.CharField(max_length=120, verbose_name='Origem')
    destination = models.CharField(max_length=120, verbose_name='Destino')
    flight_date = models.DateField(null=True, blank=True, verbose_name='Data do Voo')
    estimated_value = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='Valor Estimado (R$)',
    )
    notes = models.TextField(blank=True, verbose_name='Observações')

    class Meta:
        db_table = 'flight_tickets'
        verbose_name = 'Passagem'
        verbose_name_plural = 'Passagens'

    def __str__(self):
        return f'{self.origin} → {self.destination} ({self.travel_request.request_number})'


class TravelAdvance(BaseModel):
    """Bloco 'Outros Adiantamentos' do SDP: natureza, valor e justificativa."""

    class Nature(models.TextChoices):
        PROVEN_EXPENSES = 'PROVEN_EXPENSES', 'Despesas comprovadas'
        LODGING = 'LODGING', 'Hospedagem'
        URBAN_TRANSPORT = 'URBAN_TRANSPORT', 'Deslocamento urbano'
        SERVICES = 'SERVICES', 'Serviços'
        EVENT_FEE = 'EVENT_FEE', 'Serviços - Taxa de inscrição em eventos'

    travel_request = models.ForeignKey(
        TravelRequest, on_delete=models.CASCADE,
        related_name='advances', verbose_name='Viagem',
    )
    nature = models.CharField(max_length=20, choices=Nature.choices, verbose_name='Natureza')
    value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, verbose_name='Valor (R$)',
    )
    justification = models.TextField(blank=True, verbose_name='Justificativa')

    class Meta:
        db_table = 'travel_advances'
        verbose_name = 'Outro Adiantamento'
        verbose_name_plural = 'Outros Adiantamentos'

    def __str__(self):
        return f'{self.get_nature_display()} — {self.value}'
