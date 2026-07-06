"""
tests/test_sagu_parity.py — Testes das funcionalidades de paridade com o SAGU:
favorecidos múltiplos, cálculo por favorecido, máquina de estados,
formato SEI e conflito de agenda de veículos/motoristas.
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.contrib.auth.models import User

from apps.users.models import UserProfile
from apps.travel_requests.models import (
    TravelRequest, TravelBeneficiary, Destination, StatusChange,
)
from apps.travel_requests.serializers import TravelBeneficiarySerializer
from apps.fleet.models import Vehicle, Driver, VehicleAssignment
from core.models import SystemConfig


def make_profile(username, role='REQUESTER'):
    user = User.objects.create_user(username=username, password='x')
    return UserProfile.objects.create(
        user=user, full_name=f'User {username}', email=f'{username}@embrapa.br',
        registration_number=f'MAT-{username}', profile_role=role,
    )


def make_trip(requester, dest, start_offset=10, length=4):
    dep = date.today() + timedelta(days=start_offset)
    return TravelRequest.objects.create(
        requester=requester, employee_type='EMPLOYEE',
        origin_city='Cruz das Almas', origin_state='BA',
        destination=dest, departure_date=dep,
        return_date=dep + timedelta(days=length),
        objective='Coleta de campo',
    )


class TestBeneficiaries(TestCase):
    """Múltiplos favorecidos por viagem, com totais individuais e geral."""

    def setUp(self):
        self.profile = make_profile('req1')
        self.dest = Destination.objects.create(city='Brasília', state='DF')
        self.trip = make_trip(self.profile, self.dest)

    def test_multiple_beneficiaries_totals(self):
        """1 viagem : N favorecidos — total por pessoa e total geral (como o SAGU)."""
        b1 = TravelBeneficiary.objects.create(
            travel_request=self.trip, full_name='Pesquisador A',
            start_date=self.trip.departure_date, end_date=self.trip.return_date,
            city='Brasília', daily_quantity=Decimal('3.5'),
            daily_rate=Decimal('756.02'), hotel_value=Decimal('400.00'),
        )
        b2 = TravelBeneficiary.objects.create(
            travel_request=self.trip, full_name='Colaborador B',
            beneficiary_type='COLLABORATOR',
            start_date=self.trip.departure_date, end_date=self.trip.return_date,
            city='Brasília', daily_quantity=Decimal('2'),
            daily_rate=Decimal('756.02'), additional_value=Decimal('100.00'),
        )
        assert b1.total_value == Decimal('3.5') * Decimal('756.02') + Decimal('400.00')
        assert b2.total_value == Decimal('2') * Decimal('756.02') + Decimal('100.00')
        assert self.trip.total_beneficiaries_value == b1.total_value + b2.total_value

    def test_sei_format_validation(self):
        """Processo SEI deve seguir NNNNN.NNNNNN/NNNN-NN."""
        base = dict(
            travel_request=self.trip.id, full_name='X',
            start_date=self.trip.departure_date, end_date=self.trip.return_date,
        )
        ok = TravelBeneficiarySerializer(data={**base, 'sei_process': '21158.000123/2026-45'})
        assert ok.is_valid(), ok.errors
        bad = TravelBeneficiarySerializer(data={**base, 'sei_process': '123/2026'})
        assert not bad.is_valid()
        assert 'sei_process' in bad.errors


class TestStatusMachine(TestCase):
    """Máquina de estados equivalente ao SAGU (com histórico e observação)."""

    def setUp(self):
        self.profile = make_profile('req2')
        self.approver = make_profile('chief', role='SUPERVISOR')
        self.dest = Destination.objects.create(city='Salvador', state='BA')
        self.trip = make_trip(self.profile, self.dest)

    def test_valid_flow_with_history(self):
        self.trip.change_status('SUBMITTED', changed_by=self.profile)
        self.trip.change_status('UNDER_REVIEW', changed_by=self.approver, observation='Verificando dotação')
        self.trip.change_status('APPROVED', changed_by=self.approver)
        self.trip.change_status('COMPLETED', changed_by=self.approver)
        history = list(StatusChange.objects.filter(travel_request=self.trip).order_by('created_at'))
        assert [h.to_status for h in history] == ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED']
        assert history[1].observation == 'Verificando dotação'

    def test_invalid_transition_rejected(self):
        """DRAFT não pode ir direto para COMPLETED."""
        with pytest.raises(ValueError):
            self.trip.change_status('COMPLETED')

    def test_terminal_states(self):
        self.trip.change_status('SUBMITTED')
        self.trip.change_status('REJECTED', observation='Sem dotação no PI')
        with pytest.raises(ValueError):
            self.trip.change_status('APPROVED')


class TestFleetAgenda(TestCase):
    """Conflito de agenda: mesmo veículo/motorista não pode estar em duas viagens ativas sobrepostas."""

    def setUp(self):
        self.profile = make_profile('req3')
        self.dest = Destination.objects.create(city='Feira de Santana', state='BA')
        self.vehicle = Vehicle.objects.create(plate='ABC1D23', model='Fiat Toro')
        self.driver = Driver.objects.create(
            name='João Motorista', cnh_number='123456', cnh_expiry=date(2030, 1, 1),
        )
        self.trip1 = make_trip(self.profile, self.dest, start_offset=10, length=4)
        VehicleAssignment.objects.create(
            travel_request=self.trip1, vehicle=self.vehicle, driver=self.driver,
        )

    def test_overlapping_vehicle_rejected(self):
        trip2 = make_trip(self.profile, self.dest, start_offset=12, length=3)
        with pytest.raises(ValidationError):
            VehicleAssignment.objects.create(travel_request=trip2, vehicle=self.vehicle)

    def test_non_overlapping_vehicle_allowed(self):
        trip3 = make_trip(self.profile, self.dest, start_offset=20, length=2)
        VehicleAssignment.objects.create(travel_request=trip3, vehicle=self.vehicle)
        assert self.vehicle.assignments.count() == 2

    def test_cancelled_trip_frees_agenda(self):
        """Viagem cancelada libera o veículo para o mesmo período."""
        self.trip1.status = TravelRequest.StatusChoices.CANCELLED
        self.trip1.save()
        trip4 = make_trip(self.profile, self.dest, start_offset=11, length=2)
        VehicleAssignment.objects.create(travel_request=trip4, vehicle=self.vehicle)

    def test_overlapping_driver_rejected(self):
        trip5 = make_trip(self.profile, self.dest, start_offset=12, length=1)
        other_vehicle = Vehicle.objects.create(plate='XYZ9K88', model='Hilux')
        with pytest.raises(ValidationError):
            VehicleAssignment.objects.create(
                travel_request=trip5, vehicle=other_vehicle, driver=self.driver,
            )
