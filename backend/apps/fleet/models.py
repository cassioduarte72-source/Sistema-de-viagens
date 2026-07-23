"""
apps/fleet/models.py — Frota: veículos, motoristas e alocação em viagens.

Paridade com o SAGU: cadastros de Veículos (placa, modelo, ano, carga, ativo)
e Motoristas (CNH, validade, interno Embrapa ou SLT/terceirizado), ação
'Motorista e Veículo' vinculando recursos à viagem, e agendas de ocupação
com validação de conflito de período.
"""
from django.core.exceptions import ValidationError
from django.db import models, transaction, IntegrityError
from django.utils import timezone
from core.models import BaseModel

# Status de viagem que NÃO ocupam agenda
INACTIVE_TRIP_STATUSES = ('REJECTED', 'CANCELLED')


class Vehicle(BaseModel):
    plate = models.CharField(max_length=10, unique=True, verbose_name='Placa')
    model = models.CharField(max_length=100, verbose_name='Modelo')
    year = models.PositiveIntegerField(null=True, blank=True, verbose_name='Ano')
    is_cargo = models.BooleanField(default=False, verbose_name='Carga')
    active = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        db_table = 'fleet_vehicles'
        verbose_name = 'Veículo'
        verbose_name_plural = 'Veículos'
        ordering = ['plate']

    def __str__(self):
        return f'{self.plate} — {self.model}'


class Driver(BaseModel):
    profile = models.ForeignKey(
        'users.UserProfile', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='driver_records',
        verbose_name='Usuário Vinculado',
    )
    name = models.CharField(max_length=200, verbose_name='Nome')
    cnh_number = models.CharField(max_length=20, verbose_name='CNH')
    cnh_expiry = models.DateField(verbose_name='Validade da CNH')
    is_embrapa = models.BooleanField(
        default=True, verbose_name='Motorista da Embrapa',
        help_text='Desmarcado = terceirizado / SLT',
    )
    active = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        db_table = 'fleet_drivers'
        verbose_name = 'Motorista'
        verbose_name_plural = 'Motoristas'
        ordering = ['name']

    def __str__(self):
        origin = 'Embrapa' if self.is_embrapa else 'SLT'
        return f'{self.name} ({origin})'


class VehicleAssignment(BaseModel):
    """
    Alocação de veículo (e opcionalmente motorista) a uma viagem —
    ação 'Motorista e Veículo' / 'Viagens Terrestres' do SAGU.
    Valida conflito de agenda contra outras viagens ativas no mesmo período.
    """
    travel_request = models.ForeignKey(
        'travel_requests.TravelRequest', on_delete=models.CASCADE,
        related_name='vehicle_assignments', verbose_name='Viagem',
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT,
        related_name='assignments', verbose_name='Veículo',
    )
    driver = models.ForeignKey(
        Driver, null=True, blank=True, on_delete=models.PROTECT,
        related_name='assignments', verbose_name='Motorista',
    )
    notes = models.TextField(blank=True, verbose_name='Observações')

    class Meta:
        db_table = 'fleet_assignments'
        verbose_name = 'Alocação de Veículo'
        verbose_name_plural = 'Alocações de Veículos'

    def __str__(self):
        return f'{self.vehicle.plate} → {self.travel_request.request_number}'

    # ─── Validação de conflito de agenda ────────────────────────────────────
    def _overlapping(self, qs):
        """Filtra alocações cujas viagens ativas se sobrepõem ao período desta."""
        trip = self.travel_request
        return (
            qs.exclude(pk=self.pk)
            .exclude(travel_request__status__in=INACTIVE_TRIP_STATUSES)
            .filter(
                travel_request__departure_date__lte=trip.return_date,
                travel_request__return_date__gte=trip.departure_date,
            )
        )

    def clean(self):
        conflicts = self._overlapping(
            VehicleAssignment.objects.filter(vehicle=self.vehicle)
        )
        if conflicts.exists():
            other = conflicts.select_related('travel_request').first()
            raise ValidationError({
                'vehicle': (
                    f'Veículo {self.vehicle.plate} já alocado à viagem '
                    f'{other.travel_request.request_number} '
                    f'({other.travel_request.departure_date} a '
                    f'{other.travel_request.return_date}).'
                )
            })
        if self.driver:
            d_conflicts = self._overlapping(
                VehicleAssignment.objects.filter(driver=self.driver)
            )
            if d_conflicts.exists():
                other = d_conflicts.select_related('travel_request').first()
                raise ValidationError({
                    'driver': (
                        f'Motorista {self.driver.name} já alocado à viagem '
                        f'{other.travel_request.request_number} no período.'
                    )
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class VehicleRequisition(BaseModel):
    """
    Requisição de Veículo — documento do processo de 'Requisição de Veículos e
    Controle de Frota' (fluxograma). Nasce de uma Solicitação de Viagem (como no
    SDP: link 'Deseja solicitar reserva de veículos?') e percorre as raias
    REQUISITANTE → SOF → CHADM → SIL.

    Fase 1: identidade, vínculo com a viagem, dados do passo 1 do fluxograma
    (KM estimada, trajeto, objetivo) e a máquina de status. Reserva de veículo/
    motorista reaproveita VehicleAssignment (validação de conflito de agenda).
    Vistoria, check-lists, KM real e Diário de Bordo entram em fases seguintes.
    """

    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Solicitada'          # passos 1–4
        CHADM_REVIEW = 'CHADM_REVIEW', 'Em análise (CHADM)'  # após 'ENVIAR ao CHADM'
        NEGATED = 'NEGATED', 'Negada'                  # passos 6–8 (sem recurso)
        AT_SIL = 'AT_SIL', 'Remetida ao SIL'           # passo 9
        RESERVED = 'RESERVED', 'Reservada'             # passos 14–15
        IN_USE = 'IN_USE', 'Em uso'                    # após 'RETIRAR veículo'
        CLOSED = 'CLOSED', 'Fechada'                   # passo 24
        CANCELLED = 'CANCELLED', 'Cancelada'           # passo 12

    # Transições válidas por status (espelha o fluxograma; no fluxo atual a
    # requisição vai direto ao SLT quando a viagem é encaminhada)
    ALLOWED_TRANSITIONS = {
        'REQUESTED': ['CHADM_REVIEW', 'AT_SIL', 'CANCELLED'],
        'CHADM_REVIEW': ['AT_SIL', 'NEGATED', 'CANCELLED'],
        'AT_SIL': ['RESERVED', 'CANCELLED'],
        'RESERVED': ['IN_USE', 'CANCELLED'],
        'IN_USE': ['CLOSED'],
        'NEGATED': [],
        'CLOSED': [],
        'CANCELLED': [],
    }

    number = models.CharField(
        max_length=25, unique=True, blank=True,
        verbose_name='Número da Requisição',
    )
    travel_request = models.ForeignKey(
        'travel_requests.TravelRequest', on_delete=models.CASCADE,
        related_name='vehicle_requisitions', verbose_name='Viagem',
    )
    requester = models.ForeignKey(
        'users.UserProfile', on_delete=models.PROTECT,
        related_name='vehicle_requisitions', verbose_name='Solicitante',
    )

    # Passo 1 do fluxograma: 'Requisição com KM estimada, trajeto definido, objetivo'
    estimated_km = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='KM Estimada',
    )
    route = models.CharField(max_length=255, blank=True, verbose_name='Trajeto')
    objective = models.TextField(blank=True, verbose_name='Objetivo')
    # Pessoas que vão no mesmo veículo (veículo compartilhado) — o SLT precisa saber
    passengers = models.TextField(
        blank=True, verbose_name='Passageiros (mesmo veículo)',
        help_text='Nomes das pessoas que viajam neste veículo (ex.: viagem coletiva).',
    )

    # Decisões (gateways do fluxograma)
    needs_driver = models.BooleanField(
        default=False, verbose_name='Necessita Motorista?',
    )
    requester_is_driver = models.BooleanField(
        default=False, verbose_name='Cliente será o Motorista?',
    )

    # Reserva feita pelo SIL (passos 14–15) — reaproveita a alocação existente
    assignment = models.OneToOneField(
        VehicleAssignment, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='requisition',
        verbose_name='Alocação (Veículo/Motorista)',
    )

    # KM real (passo 23) — preenchido no fechamento
    actual_km = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='KM Real',
    )

    # Negativa do CHADM (passos 6–7)
    negation_reason = models.TextField(blank=True, verbose_name='Motivo da Negativa')

    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.REQUESTED, verbose_name='Status',
    )

    class Meta:
        db_table = 'fleet_requisitions'
        verbose_name = 'Requisição de Veículo'
        verbose_name_plural = 'Requisições de Veículos'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['travel_request']),
        ]

    def __str__(self):
        return f'{self.number or "REQ-VEIC"} — {self.travel_request.request_number}'

    # ─── Máquina de estados ─────────────────────────────────────────────────
    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])

    def _transition(self, new_status, **update_fields):
        if not self.can_transition_to(new_status):
            raise ValidationError(
                f'Transição inválida: {self.get_status_display()} → {new_status}.'
            )
        self.status = new_status
        fields = ['status', 'updated_at', *update_fields.keys()]
        for field, value in update_fields.items():
            setattr(self, field, value)
        self.save(update_fields=fields)
        return self

    def send_to_chadm(self):
        """Passo 4: SOF envia ao CHADM para análise de recursos."""
        return self._transition(self.Status.CHADM_REVIEW)

    def remit_to_sil(self):
        """Passo 9: CHADM confirma recursos e remete ao SIL."""
        return self._transition(self.Status.AT_SIL)

    def send_to_slt(self):
        """Fluxo direto: ao encaminhar a viagem, a requisição vai direto ao SLT."""
        return self._transition(self.Status.AT_SIL)

    def negate(self, reason=''):
        """Passos 6–7: CHADM justifica e notifica a negativa por falta de recurso."""
        return self._transition(self.Status.NEGATED, negation_reason=reason)

    def reserve(self, vehicle, driver=None, notes=''):
        """
        Passos 14–15: SIL reserva o veículo (e designa motorista, se necessário).
        Cria a VehicleAssignment, que valida conflito de agenda contra outras viagens.
        """
        if self.status != self.Status.AT_SIL:
            raise ValidationError(
                'Só é possível reservar uma requisição remetida ao SIL.'
            )
        assignment = VehicleAssignment(
            travel_request=self.travel_request,
            vehicle=vehicle, driver=driver, notes=notes,
        )
        assignment.save()  # dispara full_clean() → valida conflito
        return self._transition(self.Status.RESERVED, assignment=assignment)

    @property
    def initial_checklist(self):
        return self.checklists.filter(kind=VehicleChecklist.Kind.INITIAL).first()

    @property
    def final_checklist(self):
        return self.checklists.filter(kind=VehicleChecklist.Kind.FINAL).first()

    def start_use(self):
        """Passos 17–21: exige a vistoria/check-list de saída antes de retirar o veículo."""
        if not self.initial_checklist:
            raise ValidationError(
                'Realize o check-list de saída (vistoria prévia) antes de iniciar o uso.'
            )
        return self._transition(self.Status.IN_USE)

    def close(self, actual_km=None):
        """
        Passos 22–24: exige o check-list de retorno; a KM real vem do check-list
        quando não informada explicitamente.
        """
        final = self.final_checklist
        if not final:
            raise ValidationError(
                'Realize o check-list de retorno antes de fechar a requisição.'
            )
        if actual_km is None and final.km is not None:
            actual_km = final.km
        fields = {}
        if actual_km is not None:
            fields['actual_km'] = actual_km
        return self._transition(self.Status.CLOSED, **fields)

    def cancel(self):
        """Passo 12: cancela a requisição e libera o veículo/motorista alocado."""
        assignment = self.assignment
        result = self._transition(self.Status.CANCELLED, assignment=None)
        if assignment:
            assignment.delete()  # libera a agenda do veículo/motorista
        return result

    # ─── Numeração sequencial: REQV-AAAA-NNNNN ──────────────────────────────
    def _generate_number(self) -> str:
        year = timezone.now().year
        prefix = f'REQV-{year}-'
        for _ in range(5):
            with transaction.atomic():
                last = (
                    VehicleRequisition.objects
                    .filter(number__startswith=prefix)
                    .order_by('-number')
                    .values_list('number', flat=True)
                    .first()
                )
                next_seq = int(last.rsplit('-', 1)[1]) + 1 if last else 1
                number = f'{prefix}{next_seq:05d}'
                try:
                    VehicleRequisition.objects.filter(pk=self.pk).update(number=number)
                    self.number = number
                    return number
                except IntegrityError:
                    continue
        raise IntegrityError('Não foi possível gerar número único para a requisição.')


# --- Signal: gera number automaticamente na criação ---
from django.db.models.signals import post_save  # noqa: E402
from django.dispatch import receiver  # noqa: E402


@receiver(post_save, sender=VehicleRequisition)
def generate_requisition_number(sender, instance, created, **kwargs):
    if created and not instance.number:
        instance._generate_number()


class VehicleChecklist(BaseModel):
    """
    Check-list / vistoria do veículo na saída e no retorno (passos 17, 18 e 22
    do fluxograma). Registra odômetro, combustível e itens conferidos, além de
    avarias observadas. Um por tipo (saída/retorno) em cada requisição.
    """

    class Kind(models.TextChoices):
        INITIAL = 'INITIAL', 'Saída (vistoria prévia)'
        FINAL = 'FINAL', 'Retorno'

    class FuelLevel(models.TextChoices):
        RESERVE = 'RESERVE', 'Reserva'
        QUARTER = 'QUARTER', '1/4'
        HALF = 'HALF', '1/2'
        THREE_QUARTER = 'THREE_QUARTER', '3/4'
        FULL = 'FULL', 'Cheio'

    requisition = models.ForeignKey(
        VehicleRequisition, on_delete=models.CASCADE,
        related_name='checklists', verbose_name='Requisição',
    )
    kind = models.CharField(max_length=10, choices=Kind.choices, verbose_name='Momento')

    km = models.PositiveIntegerField(null=True, blank=True, verbose_name='Odômetro (KM)')
    fuel_level = models.CharField(
        max_length=15, choices=FuelLevel.choices, blank=True,
        verbose_name='Nível de Combustível',
    )

    # Itens conferidos (True = conforme)
    tires_ok = models.BooleanField(default=True, verbose_name='Pneus e estepe OK')
    lights_ok = models.BooleanField(default=True, verbose_name='Faróis e lanternas OK')
    documents_ok = models.BooleanField(default=True, verbose_name='Documentos (CRLV) OK')
    extinguisher_ok = models.BooleanField(default=True, verbose_name='Extintor OK')
    cleanliness_ok = models.BooleanField(default=True, verbose_name='Limpeza OK')

    damages = models.TextField(blank=True, verbose_name='Avarias Observadas')
    observations = models.TextField(blank=True, verbose_name='Observações')
    inspected_by = models.ForeignKey(
        'users.UserProfile', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='vehicle_checklists',
        verbose_name='Vistoriado por',
    )

    class Meta:
        db_table = 'fleet_checklists'
        verbose_name = 'Check-list de Veículo'
        verbose_name_plural = 'Check-lists de Veículos'
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['requisition', 'kind'],
                name='uniq_checklist_por_requisicao_e_tipo',
            ),
        ]

    def __str__(self):
        return f'{self.get_kind_display()} — {self.requisition.number}'
