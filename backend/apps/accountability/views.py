"""apps/accountability/views.py — Fluxo: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CLOSED."""
import re
from decimal import Decimal
from django.db.models import Q

EMPENHO_PATTERN = re.compile(r'^\d{4}NE\d{6}$')  # ex.: 2026NE000121
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AccountabilityReport, ExpenseItem, AccountabilityRouting
from .serializers import AccountabilityReportSerializer, ExpenseItemSerializer

FINANCE_ROLES = ('FINANCE', 'TRAVEL_ANALYST', 'ADMIN')


def _trip_advance(travel):
    """Adiantamento da viagem = diárias (favorecidos) + outros adiantamentos."""
    diarias = sum(
        ((b.daily_quantity or Decimal('0')) * (b.daily_rate or Decimal('0'))
         for b in travel.beneficiaries.all()), Decimal('0.00'))
    outros = sum((a.value or Decimal('0') for a in travel.advances.all()), Decimal('0.00'))
    return diarias + outros


class AccountabilityReportViewSet(viewsets.ModelViewSet):
    serializer_class = AccountabilityReportSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'travel_request']

    def get_queryset(self):
        profile = self.request.user.profile
        qs = AccountabilityReport.objects.select_related(
            'travel_request', 'submitted_by',
        ).prefetch_related('expense_items', 'travel_request__beneficiaries')
        if profile.profile_role in FINANCE_ROLES:
            return qs
        return qs.filter(submitted_by=profile)

    def perform_create(self, serializer):
        """Cria a PCV pré-preenchida com o adiantamento e as datas da viagem."""
        travel = serializer.validated_data['travel_request']
        serializer.save(
            submitted_by=self.request.user.profile,
            advance_received=_trip_advance(travel),
            actual_departure_date=travel.departure_date,
            actual_return_date=travel.return_date,
        )

    @action(detail=False, methods=['get'], url_path='elegiveis')
    def elegiveis(self, request):
        """
        Viagens do usuário elegíveis para prestação de contas ('localizar o
        adiantamento'): viagens em que participa, já autorizadas, com o status
        da PCV (se já iniciada).
        """
        from apps.travel_requests.models import TravelRequest
        profile = request.user.profile
        trips = (
            TravelRequest.objects
            .filter(Q(requester=profile) | Q(beneficiaries__full_name=profile.full_name))
            .exclude(status__in=['DRAFT', 'CANCELLED', 'REJECTED'])
            .distinct()
            .prefetch_related('beneficiaries', 'advances')
        )
        rows = []
        for t in trips:
            pcv = t.accountability_report if hasattr(t, 'accountability_report') else None
            rows.append({
                'travel_request': str(t.id),
                'request_number': t.request_number,
                'roteiro': t.itinerary,
                'departure_date': t.departure_date,
                'return_date': t.return_date,
                'adiantamento': str(_trip_advance(t)),
                'pcv_id': str(pcv.id) if pcv else None,
                'pcv_status': pcv.get_status_display() if pcv else None,
            })
        return Response(rows)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        """Gera o PDF da PCV (formato SDP) para subir no processo SEI."""
        from django.http import HttpResponse
        from .pdf import build_pcv_pdf
        report = self.get_object()
        conteudo = build_pcv_pdf(report)
        resp = HttpResponse(conteudo, content_type='application/pdf')
        nome = f'PCV-{report.travel_request.request_number}.pdf'
        resp['Content-Disposition'] = f'attachment; filename="{nome}"'
        return resp

    @action(detail=False, methods=['get'], url_path='analise')
    def analise(self, request):
        """Caixa de análise do SOF: prestações enviadas aguardando atesto."""
        if request.user.profile.profile_role not in FINANCE_ROLES:
            return Response({'detail': 'Acesso restrito ao SOF.'}, status=status.HTTP_403_FORBIDDEN)
        reports = self.get_queryset().filter(
            status=AccountabilityReport.StatusChoices.SUBMITTED
        )
        return Response(self.get_serializer(reports, many=True).data)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        report = self.get_object()
        if report.status != AccountabilityReport.StatusChoices.DRAFT:
            return Response(
                {'error': 'Apenas prestações em rascunho podem ser enviadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = AccountabilityReport.StatusChoices.SUBMITTED
        report.submitted_at = timezone.now()
        report.save(update_fields=['status', 'submitted_at', 'updated_at'])
        AccountabilityRouting.objects.create(
            report=report, action='PCV enviada para análise pelo favorecido',
            responsible=request.user.profile,
        )
        # Regulariza o CPF do favorecido (desbloqueia, se estava inadimplente)
        from apps.users.models import Favorecido
        cpfs = [b.cpf for b in report.travel_request.beneficiaries.all() if b.cpf]
        if cpfs:
            Favorecido.objects.filter(cpf__in=cpfs, blocked=True).update(
                blocked=False, blocked_reason='',
            )
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """
        SOF atesta (APPROVED) ou retorna para a fase anterior (RETURNED) com
        justificativa; pode informar a Nota de Empenho. Registra o encaminhamento.
        """
        profile = request.user.profile
        if profile.profile_role not in FINANCE_ROLES:
            return Response(
                {'error': 'Apenas o setor financeiro pode analisar prestações de contas.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        report = self.get_object()
        decision = request.data.get('decision')
        note = request.data.get('notes', '')
        if decision not in ('APPROVED', 'RETURNED'):
            return Response(
                {'error': "Informe decision: 'APPROVED' ou 'RETURNED'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if decision == 'RETURNED' and not note.strip():
            return Response(
                {'notes': 'Informe a justificativa ao retornar a PCV para a fase anterior.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        empenho = (request.data.get('commitment_number') or '').strip()
        if empenho and not EMPENHO_PATTERN.match(empenho):
            return Response(
                {'commitment_number': 'Formato inválido. Use AAAANE000000 (ex.: 2026NE000121).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if empenho:
            report.commitment_number = empenho
        report.reviewed_by = profile
        report.reviewed_at = timezone.now()
        report.review_notes = note
        if decision == 'APPROVED':
            report.status = AccountabilityReport.StatusChoices.APPROVED
            acao = 'Aprovação de PCV — atestada pelo SOF'
        else:
            report.status = AccountabilityReport.StatusChoices.DRAFT
            acao = 'Aprovação de PCV — retornar para a fase anterior'
        report.save()
        AccountabilityRouting.objects.create(
            report=report, action=acao, responsible=profile, note=note,
        )
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        """Encerramento definitivo pelo SOF após atesto e acerto financeiro."""
        profile = request.user.profile
        if profile.profile_role not in FINANCE_ROLES:
            return Response({'error': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        report = self.get_object()
        if report.status != AccountabilityReport.StatusChoices.APPROVED:
            return Response(
                {'error': 'Apenas prestações atestadas podem ser encerradas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.status = AccountabilityReport.StatusChoices.CLOSED
        report.save(update_fields=['status', 'updated_at'])

        # Marca a viagem como concluída
        travel = report.travel_request
        travel.status = travel.StatusChoices.COMPLETED
        travel.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(report).data)


class ExpenseItemViewSet(viewsets.ModelViewSet):
    """Comprovação de Despesa (itens) da PCV — CRUD pelo favorecido/SOF."""
    serializer_class = ExpenseItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['report']

    def get_queryset(self):
        profile = self.request.user.profile
        qs = ExpenseItem.objects.select_related('report')
        if profile.profile_role in FINANCE_ROLES:
            return qs
        return qs.filter(report__submitted_by=profile)

    def perform_create(self, serializer):
        """O valor aprovado começa igual ao comprovado (SOF ajusta na análise)."""
        data = serializer.validated_data
        if not data.get('approved_value'):
            data['approved_value'] = data.get('proven_value') or Decimal('0.00')
        serializer.save()
