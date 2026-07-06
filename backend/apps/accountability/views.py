"""apps/accountability/views.py — Fluxo: DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CLOSED."""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AccountabilityReport
from .serializers import AccountabilityReportSerializer

FINANCE_ROLES = ('FINANCE', 'TRAVEL_ANALYST', 'ADMIN')


class AccountabilityReportViewSet(viewsets.ModelViewSet):
    serializer_class = AccountabilityReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        profile = self.request.user.profile
        qs = AccountabilityReport.objects.select_related(
            'travel_request', 'submitted_by',
        )
        if profile.profile_role in FINANCE_ROLES:
            return qs
        return qs.filter(submitted_by=profile)

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user.profile)

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
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        """SOF atesta (approve) ou devolve para ajuste (return_to_draft)."""
        profile = request.user.profile
        if profile.profile_role not in FINANCE_ROLES:
            return Response(
                {'error': 'Apenas o setor financeiro pode analisar prestações de contas.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        report = self.get_object()
        decision = request.data.get('decision')
        if decision not in ('APPROVED', 'RETURNED'):
            return Response(
                {'error': "Informe decision: 'APPROVED' ou 'RETURNED'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report.reviewed_by = profile
        report.reviewed_at = timezone.now()
        report.review_notes = request.data.get('notes', '')
        report.status = (
            AccountabilityReport.StatusChoices.APPROVED
            if decision == 'APPROVED'
            else AccountabilityReport.StatusChoices.DRAFT
        )
        report.save()
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
