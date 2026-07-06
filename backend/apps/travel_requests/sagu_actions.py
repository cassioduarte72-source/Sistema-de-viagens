"""
apps/travel_requests/sagu_actions.py — Ações de paridade com o SAGU
aplicadas ao TravelRequestViewSet via mixin: alterar status com observação
e e-mail opcional, histórico de status e transcrição para digitação no SDP.
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated
from core.models import SystemConfig
from .serializers import StatusChangeSerializer, ResourceLineSerializer
from .models import TravelRequest, ResourceLine

FINANCE_ROLES = ('FINANCE', 'TRAVEL_ANALYST', 'ADMIN')

# Mapeamento de status SAV ↔ nomenclatura SAGU (para exibição)
SAGU_STATUS_LABELS = {
    'DRAFT': 'Rascunho',
    'SUBMITTED': 'Solicitada',
    'UNDER_REVIEW': 'Em análise',
    'APPROVED': 'Aprovada',
    'REJECTED': 'Não atendida',
    'CANCELLED': 'Cancelada',
    'COMPLETED': 'Finalizada',
}


class TravelRequestSaguActionsMixin:
    """Ações adicionadas ao TravelRequestViewSet (mixin aplicado abaixo)."""

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        """
        Tela 'Alterar Status' do SAGU: muda o status com observação
        e, opcionalmente, envia e-mail ao solicitante (send_email=true).
        """
        travel = self.get_object()
        profile = request.user.profile
        new_status = request.data.get('status', '')
        observation = request.data.get('observation', '')
        send_email = bool(request.data.get('send_email', False))

        # Quem pode mudar status: aprovadores e papéis elevados
        if not (profile.is_approver or profile.profile_role in FINANCE_ROLES):
            return Response(
                {'error': 'Sem permissão para alterar o status da viagem.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            change = travel.change_status(
                new_status, changed_by=profile, observation=observation,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if send_email:
            from apps.notifications.tasks import notify_status_changed
            notify_status_changed.delay(
                str(travel.id), new_status, observation,
            )
            change.email_sent = True
            change.save(update_fields=['email_sent', 'updated_at'])

        return Response({
            'message': f'Status alterado para {SAGU_STATUS_LABELS.get(new_status, new_status)}.',
            'change': StatusChangeSerializer(change).data,
        })

    @action(detail=True, methods=['get'], url_path='status-history')
    def status_history(self, request, pk=None):
        travel = self.get_object()
        changes = travel.status_changes.select_related('changed_by')
        return Response(StatusChangeSerializer(changes, many=True).data)

    @action(detail=True, methods=['get'], url_path='sdp-transcript')
    def sdp_transcript(self, request, pk=None):
        """
        'Fila de digitação SDP': retorna os dados da viagem organizados
        na ordem exata dos campos das telas do SDP, para transcrição
        manual sem redigitação de rascunho. NÃO é integração com o SDP.
        """
        travel = self.get_object()
        beneficiaries = []
        for b in travel.beneficiaries.select_related('budget').all():
            budget = getattr(b, 'budget', None)
            beneficiaries.append({
                # Ordem da tela 'Incluir Nova Solicitação' do SDP
                'viagem': 'Internacional' if (travel.destination and travel.destination.is_international) else 'Nacional',
                'favorecido_tipo': b.get_beneficiary_type_display(),
                'favorecido_nome': b.full_name,
                'onus': travel.get_cost_type_display(),
                'unidade_gestora': 'CNPMF',
                'periodo': {'inicio': b.start_date, 'fim': b.end_date},
                'cidade': b.city,
                'qtde_diarias': str(b.daily_quantity),
                'valor_diaria': str(b.daily_rate),
                'hotel': str(b.hotel_value),
                'adicionais': str(b.additional_value),
                'total': str(b.total_value),
                'processo_sei': b.sei_process,
                'orcamento': {
                    'elemento_despesa': budget.expense_element if budget else '',
                    'ugr': budget.ugr if budget else '',
                    'fonte': budget.funding_source if budget else '',
                    'ptres': budget.ptres if budget else '',
                    'pi': budget.pi if budget else '',
                    'empenho': budget.commitment_number if budget else '',
                } if budget else None,
            })
        return Response({
            'numero_sav': travel.request_number,
            'status_sagu': SAGU_STATUS_LABELS.get(travel.status, travel.status),
            'solicitante': travel.requester.full_name,
            'modalidade': travel.modality,
            'roteiro': f'{travel.origin_city}/{travel.origin_state} → {travel.destination} → {travel.origin_city}/{travel.origin_state}',
            'saida': travel.departure_date,
            'retorno': travel.return_date,
            'justificativa': travel.objective,
            'projeto': str(travel.project) if travel.project_id else None,
            'total_geral': str(travel.total_beneficiaries_value),
            'favorecidos': beneficiaries,
        })


# aplica o mixin ao viewset já registrado


class WizardActionsMixin:
    """Ações do portal de autoatendimento, aplicadas ao TravelRequestViewSet."""

    @action(detail=False, methods=['get'], url_path='wizard-options',
            permission_classes=[IsAuthenticated])
    def wizard_options(self, request):
        """
        Metadados do assistente de solicitação em etapas:
        passo 1 (fontes de custeio), passo 2 (linhas de recurso e tipos de
        viagem com textos de orientação) e parâmetros de antecedência.
        O frontend renderiza o wizard inteiro a partir desta resposta.
        """
        return Response({
            'cost_sources': [
                {'value': v, 'label': l}
                for v, l in TravelRequest.CostType.choices
                if v != 'NO_EMBRAPA_COST'  # legado não aparece para novas viagens
            ],
            'resource_lines': ResourceLineSerializer(
                ResourceLine.objects.filter(active=True), many=True,
            ).data,
            'trip_types': [
                {
                    'value': v, 'label': l,
                    'help': TravelRequest.TRIP_TYPE_HELP.get(v, ''),
                }
                for v, l in TravelRequest.TripType.choices
            ],
            'min_advance_days': int(SystemConfig.get_value('MIN_ADVANCE_DAYS', '3')),
            'exceptionality_advance_days': int(
                SystemConfig.get_value('EXCEPTIONALITY_ADVANCE_DAYS', '17')
            ),
        })

    @action(detail=False, methods=['get'], url_path='mine')
    def mine(self, request):
        """
        'Minhas Viagens': apenas as viagens do usuário logado, no formato
        da grade do SAGU (nº, modalidade, cidade, UF, ônus, status),
        independentemente do papel do usuário.
        """
        profile = request.user.profile
        trips = (
            TravelRequest.objects
            .filter(requester=profile)
            .select_related('destination')
            .order_by('-created_at')
        )
        rows = [
            {
                'id': str(t.id),
                'numero': t.request_number,
                'nome': t.get_trip_type_display() or t.modality,
                'cidade': t.destination.city if t.destination else '',
                'uf': t.destination.state if t.destination else '',
                'onus': t.get_cost_type_display(),
                'status': SAGU_STATUS_LABELS.get(t.status, t.status),
                'saida': t.departure_date,
                'retorno': t.return_date,
                'pode_cancelar': t.can_be_cancelled,
            }
            for t in trips
        ]
        return Response(rows)


