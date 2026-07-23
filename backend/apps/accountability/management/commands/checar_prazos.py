"""
checar_prazos — rotina diária de prazos da Prestação de Contas (PCV).

Prazo da PCV = data de retorno da viagem + N dias (SystemConfig PCV_DEADLINE_DAYS, padrão 5).
- Falta 1 dia para o vencimento → e-mail ao solicitante/envolvidos com link.
- 1 dia (ou mais) após o vencimento sem prestar contas → bloqueia o CPF do
  favorecido (inadimplente): ele não pode ser incluído em nova viagem até regularizar.

Em produção, agendar via Celery Beat (diário). Em desenvolvimento/simulação,
rodar manualmente:  python manage.py checar_prazos
Use --hoje AAAA-MM-DD para simular a checagem em outra data.
"""
from datetime import date, timedelta
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand

from core.models import SystemConfig
from apps.travel_requests.models import TravelRequest
from apps.users.models import Favorecido

# Status de PCV que contam como "prestou contas" (não é mais inadimplente)
PCV_OK = ('SUBMITTED', 'APPROVED', 'CLOSED')
# Status de viagem que não geram obrigação de PCV
SEM_PCV = ('DRAFT', 'CANCELLED', 'REJECTED')


class Command(BaseCommand):
    help = 'Verifica prazos da PCV: avisa 1 dia antes e bloqueia inadimplentes 1 dia após.'

    def add_arguments(self, parser):
        parser.add_argument('--hoje', help='Simula a checagem nesta data (AAAA-MM-DD).')

    def handle(self, *args, **options):
        hoje = date.fromisoformat(options['hoje']) if options.get('hoje') else date.today()
        prazo_dias = int(SystemConfig.get_value('PCV_DEADLINE_DAYS', '5'))

        avisados = bloqueados = 0
        trips = (
            TravelRequest.objects
            .exclude(status__in=SEM_PCV)
            .select_related('requester')
            .prefetch_related('beneficiaries')
        )
        for t in trips:
            if not t.return_date:
                continue
            vencimento = t.return_date + timedelta(days=prazo_dias)
            pcv = t.accountability_report if hasattr(t, 'accountability_report') else None
            if pcv and pcv.status in PCV_OK:
                continue  # já prestou contas

            if hoje == vencimento - timedelta(days=1):
                self._avisar(t, vencimento)
                avisados += 1
            if hoje >= vencimento + timedelta(days=1):
                bloqueados += self._bloquear(t, vencimento)

        self.stdout.write(self.style.SUCCESS(
            f'checar_prazos ({hoje}): avisos enviados={avisados} | CPFs bloqueados={bloqueados}'
        ))

    def _destinatarios(self, t):
        dests = [t.requester.email] + [b.email for b in t.beneficiaries.all() if b.email]
        return list({d for d in dests if d})

    def _avisar(self, t, vencimento):
        dests = self._destinatarios(t)
        if not dests:
            return
        send_mail(
            subject=f'[SAV Embrapa] Falta 1 dia — Prestação de Contas {t.request_number}',
            message=(
                'Prezado(a),\n\n'
                f'Falta 1 dia para o fim do prazo da prestação de contas da viagem '
                f'{t.request_number} (retorno em {t.return_date}; prazo até {vencimento}).\n\n'
                f'Insira os documentos comprobatórios no SAV (Prestação de Contas): '
                f'{settings.FRONTEND_URL}\n\n'
                'Após o prazo, o CPF ficará bloqueado para novas viagens até a regularização.\n\n'
                'Atenciosamente,\nSistema de Autorização de Viagens — Embrapa'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=dests, fail_silently=True,
        )

    def _bloquear(self, t, vencimento):
        n = 0
        motivo = f'PCV pendente da viagem {t.request_number} (prazo venceu em {vencimento}).'
        for b in t.beneficiaries.all():
            if b.cpf:
                n += Favorecido.objects.filter(cpf=b.cpf, blocked=False).update(
                    blocked=True, blocked_reason=motivo,
                )
        return n
