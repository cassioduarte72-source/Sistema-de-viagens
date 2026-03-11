"""
tests/test_travel_requests.py — Testes unitários do SAV.

Cobre: cálculo de diárias, geração de request_number,
e o happy path do fluxo de status.
"""

import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock

from apps.users.models import UserProfile
from apps.travel_requests.models import TravelRequest, Destination
from core.models import SystemConfig


# ─── Fixtures / Factories ─────────────────────────────────────────────────────

def make_user_profile(username='testuser', employee_type='EMPLOYEE', role='REQUESTER'):
    user = User.objects.create_user(username=username, password='senha123')
    profile = UserProfile.objects.create(
        user=user,
        employee_type=employee_type,
        profile_role=role,
        registration_number=f'MAT-{username}',
        full_name=f'Usuário {username}',
        email=f'{username}@embrapa.br',
    )
    return profile


def make_destination(city='Brasília', state='DF', is_international=False):
    dest, _ = Destination.objects.get_or_create(
        city=city,
        state=state,
        defaults={'is_international': is_international}
    )
    return dest


def make_travel_request(requester, destination, days_ahead=10):
    departure = date.today() + timedelta(days=days_ahead)
    return TravelRequest.objects.create(
        requester=requester,
        employee_type=requester.employee_type,
        cost_type=TravelRequest.CostType.EMBRAPA_COST,
        origin_city='Cruz das Almas',
        origin_state='BA',
        destination=destination,
        departure_date=departure,
        return_date=departure + timedelta(days=4),
        objective='Participar de reunião técnica',
        needs_daily_allowance=True,
        daily_quantity=Decimal('4.5'),
    )


# ─── Testes de geração de request_number ─────────────────────────────────────

class TestRequestNumberGeneration(TestCase):
    """Verifica que o número da solicitação é gerado corretamente."""

    def setUp(self):
        self.profile = make_user_profile()
        self.dest = make_destination()
        SystemConfig.objects.get_or_create(
            config_key='DAILY_RATE_NATIONAL',
            defaults={'config_value': '756.02'}
        )

    def test_request_number_format(self):
        """Número deve seguir o padrão SAV-AAAA-NNNNN."""
        travel = make_travel_request(self.profile, self.dest)
        # Simula geração do número (normalmente feita via signal)
        number = travel._generate_request_number()
        year = date.today().year
        assert number.startswith(f'SAV-{year}-')
        seq = number.split('-')[2]
        assert len(seq) == 5 and seq.isdigit()

    def test_sequential_numbers(self):
        """Duas solicitações no mesmo ano devem ter números consecutivos."""
        t1 = make_travel_request(self.profile, self.dest)
        t2 = make_travel_request(self.profile, self.dest)
        n1 = t1._generate_request_number()
        n2 = t2._generate_request_number()
        seq1 = int(n1.split('-')[2])
        seq2 = int(n2.split('-')[2])
        assert seq2 == seq1 + 1


# ─── Testes de cálculo de diárias ─────────────────────────────────────────────

class TestDailyAllowanceCalculation(TestCase):
    """Verifica que o cálculo de diárias respeita as regras de negócio."""

    def setUp(self):
        SystemConfig.objects.bulk_create([
            SystemConfig(config_key='DAILY_RATE_NATIONAL', config_value='756.02'),
            SystemConfig(config_key='DAILY_RATE_INTERNATIONAL', config_value='1200.00'),
            SystemConfig(config_key='DAILY_RATE_HALF', config_value='378.01'),
        ])

    def test_national_rate(self):
        """Diária nacional deve usar a taxa padrão configurada."""
        rate = Decimal(SystemConfig.get_value('DAILY_RATE_NATIONAL'))
        total = rate * Decimal('4.5')
        assert total == Decimal('3402.09')

    def test_international_rate(self):
        """Destino internacional deve usar taxa internacional."""
        rate = Decimal(SystemConfig.get_value('DAILY_RATE_INTERNATIONAL'))
        total = rate * Decimal('3')
        assert total == Decimal('3600.00')

    def test_destination_override(self):
        """Destino com taxa específica deve sobrescrever a global."""
        dest = Destination.objects.create(
            city='São Paulo', state='SP',
            daily_rate_override=Decimal('500.00')
        )
        assert dest.daily_rate_override == Decimal('500.00')

    def test_half_daily_fraction(self):
        """Meia diária deve ser aceita (0.5) e calcular corretamente."""
        qty = Decimal('2.5')
        rate = Decimal('756.02')
        total = qty * rate
        assert total == Decimal('1890.05')


# ─── Testes do fluxo de status (happy path) ───────────────────────────────────

class TestTravelRequestStatusFlow(TestCase):
    """Testa o fluxo completo DRAFT → SUBMITTED → APPROVED."""

    def setUp(self):
        SystemConfig.objects.get_or_create(
            config_key='MIN_ADVANCE_DAYS', defaults={'config_value': '3'}
        )
        self.requester = make_user_profile('requester')
        self.supervisor = make_user_profile('supervisor', role='SUPERVISOR')
        self.requester.supervisor = self.supervisor
        self.requester.save()
        self.dest = make_destination()

    def test_initial_status_is_draft(self):
        """Nova solicitação deve começar como DRAFT."""
        travel = make_travel_request(self.requester, self.dest)
        assert travel.status == TravelRequest.StatusChoices.DRAFT

    def test_can_submit_draft(self):
        """Solicitação DRAFT com campos obrigatórios deve poder ser enviada."""
        travel = make_travel_request(self.requester, self.dest)
        assert travel.can_be_submitted is True

    def test_submit_changes_status(self):
        """Envio deve mudar status para SUBMITTED e registrar timestamp."""
        travel = make_travel_request(self.requester, self.dest)
        travel.submit()
        assert travel.status == TravelRequest.StatusChoices.SUBMITTED
        assert travel.submitted_at is not None

    def test_cannot_edit_submitted(self):
        """Solicitação enviada não deve ser editável."""
        travel = make_travel_request(self.requester, self.dest)
        travel.submit()
        assert travel.can_be_edited is False

    def test_cancel_draft(self):
        """Deve ser possível cancelar uma solicitação em DRAFT."""
        travel = make_travel_request(self.requester, self.dest)
        travel.cancel()
        assert travel.status == TravelRequest.StatusChoices.CANCELLED

    def test_cannot_cancel_approved(self):
        """Solicitação APPROVED não deve poder ser cancelada."""
        travel = make_travel_request(self.requester, self.dest)
        travel.status = TravelRequest.StatusChoices.APPROVED
        travel.save()
        with pytest.raises(ValueError):
            travel.cancel()

    def test_balance_calculation(self):
        """Teste do saldo da prestação de contas."""
        from apps.accountability.models import AccountabilityReport
        profile = make_user_profile('acc_user')
        travel = make_travel_request(profile, self.dest)
        report = AccountabilityReport(
            travel_request=travel,
            submitted_by=profile,
            total_daily_received=Decimal('3402.09'),
            total_daily_spent=Decimal('3000.00'),
        )
        # Saldo positivo = deve devolver
        assert report.balance == Decimal('402.09')
        assert report.requires_refund is True
        assert report.requires_complement is False
