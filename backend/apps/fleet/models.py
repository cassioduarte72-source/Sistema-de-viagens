"""
apps/fleet/models.py — Frota: veículos, motoristas e alocação em viagens.

Paridade com o SAGU: cadastros de Veículos (placa, modelo, ano, carga, ativo)
e Motoristas (CNH, validade, interno Embrapa ou SLT/terceirizado), ação
'Motorista e Veículo' vinculando recursos à viagem, e agendas de ocupação
com validação de conflito de período.
"""
from django.core.exceptions import ValidationError
from django.db import models
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
