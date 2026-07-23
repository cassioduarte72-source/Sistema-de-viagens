"""
seed_demo — Prepara o ambiente de demonstração do SAV com um único comando:
usuários (solicitante, chefe/aprovador e SOF), veículo e motorista de exemplo.
Uso: python manage.py seed_demo
"""
from datetime import date, timedelta
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.users.models import UserProfile, Favorecido
from apps.fleet.models import Vehicle, Driver
from apps.travel_requests.models import TravelRequest, Destination, ResearchActivity

# Pessoas fictícias (representam o banco de favorecidos do SAGU): 5 empregados + 5 colaboradores
DEMO_FAVORECIDOS = [
    # (nome, vínculo, matrícula, cpf, unidade, cargo, chefe)
    ('Cassio Duarte Oliveira', 'EMPLOYEE', '324308', '635.491.585-72', 'CNPMF', 'Analista', 'Francisco Ferraz Laranjeira Barbosa'),
    ('Ana Paula Menezes', 'EMPLOYEE', '318742', '028.114.775-30', 'CNPMF', 'Pesquisadora', 'Francisco Ferraz Laranjeira Barbosa'),
    ('Bruno Carvalho Lima', 'EMPLOYEE', '321905', '113.556.884-01', 'CNPMF', 'Analista', 'Marcos Andrade'),
    ('Carla Souza Ribeiro', 'EMPLOYEE', '309887', '954.207.331-15', 'CNPMF', 'Técnica', 'Francisco Ferraz Laranjeira Barbosa'),
    ('Diego Fonseca Alves', 'EMPLOYEE', '327410', '471.882.660-99', 'CNPMF', 'Pesquisador', 'Marcos Andrade'),
    ('Eduarda Nunes Prado', 'COLLABORATOR', 'COL-1001', '660.339.212-48', 'UFRB', 'Bolsista', 'Ana Paula Menezes'),
    ('Gustavo Henrique Teixeira', 'COLLABORATOR', 'COL-1002', '389.550.147-72', 'UFRB', 'Estagiário', 'Bruno Carvalho Lima'),
    ('Helena Martins Rocha', 'COLLABORATOR', 'COL-1003', '744.128.900-55', 'IF Baiano', 'Bolsista', 'Carla Souza Ribeiro'),
    ('Igor Ramos Cardoso', 'COLLABORATOR', 'COL-1004', '201.663.478-12', 'UFRB', 'Colaborador Externo', 'Diego Fonseca Alves'),
    ('Juliana Freitas Barros', 'COLLABORATOR', 'COL-1005', '558.907.334-20', 'Fundecitrus', 'Pesquisadora Visitante', 'Ana Paula Menezes'),
]

# Atividades de pesquisa / Plano de Ação (tela 'Atividades' do SAGU):
# (número, título, responsável, saldo) — vigência padrão 2026 no seed
DEMO_ATIVIDADES = [
    ('10.25.11.001.00.03.008', 'Investigação de alterações moleculares associadas à criopreservação', 'Cassio Duarte Oliveira', 15230.50),
    ('10.25.11.001.00.03.007', 'Crioterapia em variedades comerciais de abacaxi e acessos do BAG Abacaxi para a remoção do complexo viral PMWaV.', 'Cassio Duarte Oliveira', 8750.00),
    ('10.25.12.002.00.02.007', 'A7 - Seleção e avaliação de fontes de dados para treino dos modelos no tema "Cultura da Mandioca"', 'Cassio Duarte Oliveira', 42100.00),
    ('10.25.13.003.00.01.002', 'Manejo integrado de pragas em fruteiras tropicais no Recôncavo Baiano', 'Cassio Duarte Oliveira', 12000.00),
    ('10.25.12.002.00.02.008', 'A8 - Seleção e elaboração de perguntas e respostas para validação e avaliação dos modelos no tema "Cultura da Mandioca"', 'Ana Paula Menezes', 5300.00),
    ('10.25.14.004.00.05.011', 'Avaliação de genótipos de mandioca tolerantes ao déficit hídrico', 'Bruno Carvalho Lima', 9900.00),
    ('13.50.14.026.00.01.002', 'Atividades de Rotina/Gestão', 'Pedro Canna Brazil Ramos', 845372.84),
]

DEMO_USERS = [
    # (username, senha, nome, matrícula, papel, supervisor_username)
    ('cassio', 'sav@2026', 'Cassio Duarte Oliveira', '324308', 'ADMIN', 'chefe'),
    ('chefe',  'sav@2026', 'Francisco Laranjeira',   '302856', 'SUPERVISOR', None),
    ('sof',    'sav@2026', 'Luciene Almeida Souza',  '310001', 'FINANCE', None),
    ('chadm',  'sav@2026', 'Marcos Andrade (CHADM)', '320002', 'CHADM', None),
    ('sil',    'sav@2026', 'Rita Barros (SIL/Frota)', '330003', 'SIL', None),
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

        # Favorecidos (banco de pessoas do SAGU) — recria o conjunto fictício
        Favorecido.objects.all().delete()
        for nome, vinculo, mat, cpf, unidade, cargo, chefe in DEMO_FAVORECIDOS:
            Favorecido.objects.create(
                full_name=nome, person_type=vinculo, registration_number=mat,
                cpf=cpf, unit=unidade, position=cargo, chief_name=chefe or '',
                email=f"{nome.split()[0].lower()}@embrapa.br",
                address='Rua Embrapa, s/n - Cruz das Almas/BA',
                bank_info='Banco do Brasil - Ag. 0000-0 C/C 00000-0',
            )

        # Favorecido do exemplo real (documentos AV/PCV) — dados exatos
        Favorecido.objects.create(
            full_name='FRANCISCO FERRAZ LARANJEIRA BARBOSA', person_type='EMPLOYEE',
            registration_number='302856', cpf='558.989.805-63', unit='CNPMF',
            position='Chefe Geral', chief_name='FRANCISCO FERRAZ LARANJEIRA BARBOSA',
            email='francisco@embrapa.br', address='Cruz das Almas/BA',
            bank_info='Banco do Brasil - Ag. 04146 C/C 00000101893',
        )

        # Atividades de pesquisa / Plano de Ação (recria o conjunto fictício)
        ResearchActivity.objects.all().delete()
        for code, titulo, responsavel, saldo in DEMO_ATIVIDADES:
            ResearchActivity.objects.create(
                code=code, description=titulo, responsible=responsavel,
                start_date=date(2026, 1, 1), end_date=date(2026, 12, 31),
                balance=saldo,
            )

        # Viagem de exemplo para o solicitante — dá onde abrir a requisição de veículo
        DEMO_OBJECTIVE = 'Reunião técnica em Brasília (viagem de demonstração)'
        dest, _ = Destination.objects.get_or_create(
            city='Brasília', defaults={'state': 'DF'},
        )
        if not TravelRequest.objects.filter(
            requester=profiles['cassio'], objective=DEMO_OBJECTIVE,
        ).exists():
            TravelRequest.objects.create(
                requester=profiles['cassio'],
                employee_type=TravelRequest.EmployeeType.EMPLOYEE,
                cost_type=TravelRequest.CostType.EMBRAPA_COST,
                origin_city='Cruz das Almas', origin_state='BA',
                destination=dest,
                departure_date=date.today() + timedelta(days=10),
                return_date=date.today() + timedelta(days=12),
                objective=DEMO_OBJECTIVE,
                status=TravelRequest.StatusChoices.APPROVED,
            )

        self.stdout.write(self.style.SUCCESS('Ambiente de demonstração pronto. Logins (senha: sav@2026):'))
        self.stdout.write('  cassio  -> solicitante (portal Minhas Viagens / wizard)')
        self.stdout.write('  chefe   -> supervisor/aprovador')
        self.stdout.write('  sof     -> financeiro (SOF)')
        self.stdout.write('  chadm   -> CHADM (analisa recursos da requisicao de veiculo)')
        self.stdout.write('  sil     -> SLT (caixa de entrada, lanca no SDP, frota/veiculos)')
