"""
tests/test_wizard.py — Regras do assistente de solicitação (portal do solicitante):
fontes de custeio condicionais, justificativa de excepcionalidade < 17 dias
para viagem aérea, metadados do wizard e 'Minhas Viagens'.
"""
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from apps.users.models import UserProfile
from apps.travel_requests.models import (
    TravelRequest, Destination, Sponsor, ResearchProject, ResourceLine,
)
from core.models import SystemConfig


class WizardTestBase(TestCase):
    def setUp(self):
        SystemConfig.objects.get_or_create(config_key='MIN_ADVANCE_DAYS', defaults={'config_value': '3'})
        SystemConfig.objects.get_or_create(config_key='EXCEPTIONALITY_ADVANCE_DAYS', defaults={'config_value': '17'})
        user = User.objects.create_user('wizuser', password='Sf@123456')
        self.profile = UserProfile.objects.create(
            user=user, full_name='Wiz User', email='wiz@embrapa.br',
            registration_number='MAT-WIZ',
        )
        self.dest = Destination.objects.create(city='Recife', state='PE')
        self.client_api = APIClient()
        r = self.client_api.post('/api/v1/auth/token/', {'username': 'wizuser', 'password': 'Sf@123456'})
        self.client_api.credentials(HTTP_AUTHORIZATION=f"Bearer {r.json()['access']}")

    def payload(self, **extra):
        dep = date.today() + timedelta(days=extra.pop('days_ahead', 30))
        base = {
            'cost_type': 'EMBRAPA_COST',
            'origin_city': 'Cruz das Almas', 'origin_state': 'BA',
            'destination': str(self.dest.id),
            'departure_date': dep.isoformat(),
            'return_date': (dep + timedelta(days=2)).isoformat(),
            'objective': 'Teste',
        }
        base.update(extra)
        return base


class TestAirExceptionality(WizardTestBase):
    """Viagem com < 15 dias de antecedência exige justificativa (qualquer meio)."""

    def test_short_notice_requires_justification(self):
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(trip_type='AIR', days_ahead=10),
            format='json',
        )
        assert r.status_code == 400
        assert 'exceptionality_justification' in r.json()

    def test_short_notice_with_justification_ok(self):
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(
                trip_type='AIR', days_ahead=10,
                exceptionality_justification='Convocação extraordinária do MAPA.',
            ),
            format='json',
        )
        assert r.status_code == 201, r.content

    def test_long_notice_no_justification_needed(self):
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(trip_type='AIR', days_ahead=30),
            format='json',
        )
        assert r.status_code == 201, r.content

    def test_ground_trip_short_notice_also_requires_justification(self):
        """Nova regra (15 dias) vale para qualquer meio, inclusive terrestre."""
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(trip_type='EMBRAPA_NO_SLT', days_ahead=10),
            format='json',
        )
        assert r.status_code == 400
        assert 'exceptionality_justification' in r.json()


class TestCostSourceRules(WizardTestBase):
    """Campos condicionais por fonte de custeio (passo 1 do wizard)."""

    def test_external_project_requires_project(self):
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(cost_type='EXTERNAL_PROJECT'),
            format='json',
        )
        assert r.status_code == 400 and 'project' in r.json()

        proj = ResearchProject.objects.create(
            number='EXT-01', name='Projeto FAPESB', is_external=True,
        )
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(cost_type='EXTERNAL_PROJECT', project=str(proj.id)),
            format='json',
        )
        assert r.status_code == 201, r.content

    def test_sponsor_requires_sponsor(self):
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(cost_type='SPONSOR'),
            format='json',
        )
        assert r.status_code == 400 and 'sponsor' in r.json()

        sp = Sponsor.objects.create(name='Fundecitrus')
        r = self.client_api.post(
            '/api/v1/travel-requests/',
            self.payload(cost_type='SPONSOR', sponsor=str(sp.id)),
            format='json',
        )
        assert r.status_code == 201, r.content


class TestWizardMetadata(WizardTestBase):
    def test_wizard_options(self):
        ResourceLine.objects.create(name='Eventos')
        r = self.client_api.get('/api/v1/travel-requests/wizard-options/')
        data = r.json()
        values = [c['value'] for c in data['cost_sources']]
        assert 'NO_COST_LOCAL' in values and 'SPONSOR' in values
        assert 'NO_EMBRAPA_COST' not in values  # legado oculto
        assert len(data['trip_types']) == 6
        air = next(t for t in data['trip_types'] if t['value'] == 'AIR')
        assert air['help']  # texto de orientação presente
        assert data['exceptionality_advance_days'] == 17

    def test_minhas_viagens(self):
        self.client_api.post('/api/v1/travel-requests/', self.payload(trip_type='AIR'), format='json')
        r = self.client_api.get('/api/v1/travel-requests/mine/')
        rows = r.json()
        assert len(rows) == 1
        assert rows[0]['status'] == 'Rascunho'
        # Grade nova mostra Favorecido/Roteiro/Meio (sem cidade/uf separados)
        assert rows[0]['favorecido'] == 'Wiz User'
        assert 'Recife' in rows[0]['roteiro']
        assert rows[0]['pode_cancelar'] is True
