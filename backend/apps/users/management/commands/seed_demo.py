"""
seed_demo — Prepara o ambiente de demonstração do SAV com um único comando:
usuários (solicitante, chefe/aprovador e SOF), veículo e motorista de exemplo.
Uso: python manage.py seed_demo
"""
from datetime import date
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.users.models import UserProfile
from apps.fleet.models import Vehicle, Driver

DEMO_USERS = [
    # (username, senha, nome, matrícula, papel, supervisor_username)
    ('cassio', 'sav@2026', 'Cassio Duarte Oliveira', '324308', 'REQUESTER', 'chefe'),
    ('chefe',  'sav@2026', 'Francisco Laranjeira',   '302856', 'SUPERVISOR', None),
    ('sof',    'sav@2026', 'Luciene Almeida Souza',  '310001', 'FINANCE', None),
]


class Command(BaseCommand):
    help = 'Cria usuários, veículo e motorista de demonstração para testar o SAV.'

    def handle(self, *args, **options):
        profiles = {}
        for username, pwd, name, mat, role, _sup in DEMO_USERS:
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password(pwd)
                user.save()
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': name,
                    'email': f'{username}@embrapa.br',
                    'registration_number': mat,
                    'profile_role': role,
                    'unit': 'CNPMF',
                },
            )
            profiles[username] = profile

        # vínculo de supervisão (o chefe aprova as viagens do cassio)
        for username, _, _, _, _, sup in DEMO_USERS:
            if sup:
                profiles[username].supervisor = profiles[sup]
                profiles[username].save(update_fields=['supervisor', 'updated_at'])

        Vehicle.objects.get_or_create(
            plate='EMB2A26', defaults={'model': 'Fiat Toro 4x4', 'year': 2024},
        )
        Driver.objects.get_or_create(
            cnh_number='00123456789',
            defaults={'name': 'José dos Santos (SLT)', 'cnh_expiry': date(2029, 12, 31),
                      'is_embrapa': False},
        )

        self.stdout.write(self.style.SUCCESS('Ambiente de demonstração pronto. Logins (senha: sav@2026):'))
        self.stdout.write('  cassio  -> solicitante (portal Minhas Viagens / wizard)')
        self.stdout.write('  chefe   -> supervisor/aprovador')
        self.stdout.write('  sof     -> financeiro')
