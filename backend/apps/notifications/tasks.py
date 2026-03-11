"""
apps/notifications/tasks.py — Tarefas assíncronas Celery para e-mails e alertas.

Todas as notificações são enviadas fora do ciclo de requisição HTTP
para não impactar a performance da API.
"""

import logging
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_approval_required(self, travel_request_id: str):
    """
    Notifica o supervisor que há uma solicitação aguardando aprovação.
    Reenvia até 3 vezes em caso de falha.
    """
    try:
        from apps.travel_requests.models import TravelRequest
        travel = TravelRequest.objects.select_related(
            'requester', 'requester__supervisor', 'destination'
        ).get(id=travel_request_id)

        supervisor = travel.requester.supervisor
        if not supervisor:
            logger.warning(f'Solicitação {travel.request_number} sem supervisor definido.')
            return

        subject = f'[SAV Embrapa] Solicitação de Viagem Aguardando Aprovação — {travel.request_number}'
        message = (
            f'Prezado(a) {supervisor.full_name},\n\n'
            f'A solicitação de viagem {travel.request_number} de {travel.requester.full_name} '
            f'para {travel.destination} ({travel.departure_date} a {travel.return_date}) '
            f'aguarda sua aprovação.\n\n'
            f'Acesse o SAV para analisar: {settings.FRONTEND_URL}/approvals\n\n'
            f'Atenciosamente,\nSistema de Autorização de Viagens — Embrapa'
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[supervisor.email],
            fail_silently=False,
        )
        logger.info(f'Notificação enviada para {supervisor.email} — {travel.request_number}')

    except Exception as exc:
        logger.error(f'Erro ao notificar supervisor: {exc}', exc_info=True)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def notify_decision_made(self, travel_request_id: str, decision: str):
    """
    Notifica o solicitante sobre a decisão (aprovação ou rejeição) da sua viagem.
    """
    try:
        from apps.travel_requests.models import TravelRequest, TravelAuthorization
        travel = TravelRequest.objects.select_related(
            'requester', 'destination'
        ).get(id=travel_request_id)

        decision_text = 'APROVADA' if decision == 'APPROVED' else 'REJEITADA'
        emoji = '✅' if decision == 'APPROVED' else '❌'

        # Busca justificativa em caso de rejeição
        justification = ''
        if decision == 'REJECTED':
            auth = travel.authorizations.filter(
                decision=TravelAuthorization.DecisionChoices.REJECTED
            ).last()
            if auth:
                justification = f'\n\nJustificativa: {auth.justification}'

        subject = (
            f'[SAV Embrapa] {emoji} Solicitação {travel.request_number} — {decision_text}'
        )
        message = (
            f'Prezado(a) {travel.requester.full_name},\n\n'
            f'Sua solicitação de viagem {travel.request_number} para {travel.destination} '
            f'foi {decision_text}.{justification}\n\n'
            f'Acesse o SAV para mais detalhes: {settings.FRONTEND_URL}/travel-requests/{travel.id}\n\n'
            f'Atenciosamente,\nSistema de Autorização de Viagens — Embrapa'
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[travel.requester.email],
            fail_silently=False,
        )

    except Exception as exc:
        logger.error(f'Erro ao notificar solicitante: {exc}', exc_info=True)
        raise self.retry(exc=exc)


@shared_task
def notify_pending_accountability():
    """
    Tarefa periódica (diária) que notifica sobre prestações de contas pendentes.
    Disparada via Celery Beat conforme configurado em settings.
    """
    from apps.travel_requests.models import TravelRequest
    from datetime import date, timedelta

    # Viagens aprovadas que já retornaram há mais de 5 dias sem prestação de contas
    cutoff_date = date.today() - timedelta(days=5)
    overdue = TravelRequest.objects.filter(
        status=TravelRequest.StatusChoices.APPROVED,
        return_date__lte=cutoff_date,
    ).select_related('requester').exclude(
        accountability_report__isnull=False
    )

    count = 0
    for travel in overdue:
        try:
            send_mail(
                subject=f'[SAV Embrapa] Prestação de Contas Pendente — {travel.request_number}',
                message=(
                    f'Prezado(a) {travel.requester.full_name},\n\n'
                    f'A prestação de contas da viagem {travel.request_number} '
                    f'(retorno em {travel.return_date}) ainda não foi enviada.\n\n'
                    f'Por favor, acesse o SAV e registre suas despesas: '
                    f'{settings.FRONTEND_URL}/accountability\n\n'
                    f'Atenciosamente,\nSistema de Autorização de Viagens — Embrapa'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[travel.requester.email],
                fail_silently=True,
            )
            count += 1
        except Exception as e:
            logger.error(f'Erro ao notificar prestação de contas: {e}')

    logger.info(f'Notificações de PC pendente enviadas: {count}')
    return count
