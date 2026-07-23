"""
apps/travel_requests/sagu_actions.py — Ações de paridade com o SAGU
aplicadas ao TravelRequestViewSet via mixin: alterar status com observação
e e-mail opcional, histórico de status e transcrição para digitação no SDP.
"""
import re
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

SEI_PATTERN = re.compile(r'^\d{5}\.\d{6}/\d{4}-\d{2}$')
EMPENHO_PATTERN = re.compile(r'^\d{4}NE\d{6}$')  # ex.: 2026NE000121

from rest_framework.permissions import IsAuthenticated
from core.models import SystemConfig
from .serializers import (
    StatusChangeSerializer, ResourceLineSerializer, TravelRequestListSerializer,
)
from .models import TravelRequest, ResourceLine

FINANCE_ROLES = ('FINANCE', 'TRAVEL_ANALYST', 'ADMIN')
SLT_ROLES = ('SIL', 'ADMIN')  # SIL = SLT (Logística/Transporte)
SOF_ROLES = ('FINANCE', 'ADMIN')  # SOF (Setor de Orçamento e Finanças)

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

    @action(detail=False, methods=['get'], url_path='slt-inbox')
    def slt_inbox(self, request):
        """
        Caixa de entrada do SLT: solicitações encaminhadas (Solicitada/SUBMITTED)
        aguardando lançamento no SDP. Restrita ao SLT (SIL) e ADMIN.
        """
        if request.user.profile.profile_role not in SLT_ROLES:
            return Response(
                {'detail': 'Acesso restrito ao SLT.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        trips = (
            TravelRequest.objects
            .filter(status=TravelRequest.StatusChoices.SUBMITTED)
            .select_related('requester', 'destination')
            .order_by('-submitted_at')
        )
        return Response(TravelRequestListSerializer(trips, many=True).data)

    @action(detail=True, methods=['post'], url_path='informar-sei')
    def informar_sei(self, request, pk=None):
        """SLT informa o número do processo SEI (NNNNN.NNNNNN/AAAA-NN)."""
        if request.user.profile.profile_role not in SLT_ROLES:
            return Response(
                {'detail': 'Acesso restrito ao SLT.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        sei = (request.data.get('sei_process') or '').strip()
        if sei and not SEI_PATTERN.match(sei):
            return Response(
                {'sei_process': 'Formato inválido. Use NNNNN.NNNNNN/AAAA-NN (ex.: 21186.001323/2026-15).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        travel = self.get_object()
        travel.sei_process = sei
        travel.save(update_fields=['sei_process', 'updated_at'])
        # Ao informar o SEI, o pedido segue para o SOF (Em análise)
        if sei and travel.status == TravelRequest.StatusChoices.SUBMITTED:
            travel.change_status(
                TravelRequest.StatusChoices.UNDER_REVIEW,
                changed_by=request.user.profile,
                observation='SEI informado; encaminhado ao SOF.',
            )
        # E-mail "AV pronta" ao solicitante/envolvidos
        if sei:
            from apps.notifications.tasks import notify_av_ready
            notify_av_ready.delay(str(travel.id))
        return Response({
            'sei_process': travel.sei_process, 'status': travel.status,
            'message': 'Processo SEI salvo; pedido encaminhado ao SOF; e-mail enviado.',
        })

    @action(detail=False, methods=['get'], url_path='sof-inbox')
    def sof_inbox(self, request):
        """Caixa do SOF: pedidos em análise (SEI informado), aguardando empenho."""
        if request.user.profile.profile_role not in SOF_ROLES:
            return Response({'detail': 'Acesso restrito ao SOF.'}, status=status.HTTP_403_FORBIDDEN)
        trips = (
            TravelRequest.objects
            .filter(status=TravelRequest.StatusChoices.UNDER_REVIEW)
            .select_related('requester', 'destination')
            .order_by('-submitted_at')
        )
        return Response(TravelRequestListSerializer(trips, many=True).data)

    @action(detail=True, methods=['post'], url_path='informar-empenho')
    def informar_empenho(self, request, pk=None):
        """SOF informa a Nota de Empenho (AAAANE000000) e o valor empenhado."""
        if request.user.profile.profile_role not in SOF_ROLES:
            return Response({'detail': 'Acesso restrito ao SOF.'}, status=status.HTTP_403_FORBIDDEN)
        empenho = (request.data.get('commitment_number') or '').strip()
        if empenho and not EMPENHO_PATTERN.match(empenho):
            return Response(
                {'commitment_number': 'Formato inválido. Use AAAANE000000 (ex.: 2026NE000121).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        travel = self.get_object()
        travel.commitment_number = empenho
        valor = request.data.get('committed_value')
        if valor not in (None, ''):
            from decimal import Decimal, InvalidOperation
            try:
                travel.committed_value = Decimal(str(valor))
            except (InvalidOperation, ValueError):
                return Response({'committed_value': 'Valor inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        travel.save(update_fields=['commitment_number', 'committed_value', 'updated_at'])
        # Ao informar o empenho, o pedido é finalizado
        if empenho and travel.status == TravelRequest.StatusChoices.UNDER_REVIEW:
            travel.change_status(
                TravelRequest.StatusChoices.COMPLETED,
                changed_by=request.user.profile,
                observation='Empenho informado pelo SOF; finalizada.',
            )
        return Response({
            'commitment_number': travel.commitment_number,
            'committed_value': str(travel.committed_value) if travel.committed_value is not None else None,
            'status': travel.status, 'message': 'Empenho e valor salvos.',
        })

    @action(detail=True, methods=['post'], url_path='concluir-sdp')
    def concluir_sdp(self, request, pk=None):
        """
        SLT marca a solicitação como lançada no SDP: conclui no SAV
        (Solicitada → Finalizada). Restrita ao SLT (SIL) e ADMIN.
        """
        if request.user.profile.profile_role not in SLT_ROLES:
            return Response(
                {'detail': 'Acesso restrito ao SLT.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        travel = self.get_object()
        try:
            travel.change_status(
                TravelRequest.StatusChoices.COMPLETED,
                changed_by=request.user.profile,
                observation='Lançada no SDP pelo SLT.',
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'status': travel.status, 'message': 'Solicitação concluída (lançada no SDP).'})

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
        from decimal import Decimal
        advances = [
            {
                'natureza': a.get_nature_display(),
                'valor': str(a.value),
                'justificativa': a.justification,
            }
            for a in travel.advances.all()
        ]
        adv_total = sum((a.value for a in travel.advances.all()), Decimal('0.00'))
        total_geral = travel.total_beneficiaries_value + adv_total
        atividade = None
        if travel.research_activity_id:
            ra = travel.research_activity
            atividade = {'codigo': ra.code, 'titulo': ra.description, 'saldo': str(ra.balance)}

        return Response({
            'numero_sav': travel.request_number,
            'status_sagu': SAGU_STATUS_LABELS.get(travel.status, travel.status),
            'processo_sei': travel.sei_process,
            'empenho': travel.commitment_number,
            'valor_empenhado': str(travel.committed_value) if travel.committed_value is not None else None,
            'solicitante': travel.requester.full_name,
            'meio_transporte': travel.get_transport_means_display(),
            'roteiro': travel.itinerary or f'{travel.origin_city}/{travel.origin_state} → {travel.destination}',
            'saida': travel.departure_date,
            'retorno': travel.return_date,
            'descricao': travel.objective,
            'observacoes': travel.observations,
            'onus': travel.get_cost_type_display(),
            'atividade': atividade,
            'adiantamentos': advances,
            'total_diarias': str(travel.total_beneficiaries_value),
            'total_adiantamentos': str(adv_total),
            'total_geral': str(total_geral),
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
            'transport_means_choices': [
                {'value': v, 'label': l}
                for v, l in TravelRequest.TransportMeans.choices
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
        from django.db.models import Q
        profile = request.user.profile
        trips = (
            TravelRequest.objects
            .filter(
                Q(requester=profile)
                | Q(beneficiaries__full_name=profile.full_name)  # viagens onde ele é favorecido
            )
            .select_related('destination')
            .prefetch_related('beneficiaries')
            .distinct()
            .order_by('-created_at')
        )
        rows = [
            {
                'id': str(t.id),
                'numero': t.request_number,
                'favorecido': (
                    t.beneficiaries.all()[0].full_name if t.beneficiaries.all()
                    else t.requester.full_name
                ),
                'roteiro': t.itinerary or (str(t.destination) if t.destination else '—'),
                'meio': t.get_transport_means_display() or '—',
                'onus': t.get_cost_type_display(),
                'status': SAGU_STATUS_LABELS.get(t.status, t.status),
                'saida': t.departure_date,
                'retorno': t.return_date,
                'pode_cancelar': t.can_be_cancelled,
            }
            for t in trips
        ]
        return Response(rows)


