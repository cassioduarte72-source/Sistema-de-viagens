"""
apps/travel_requests/views.py — ViewSets com permissões por objeto e filtros.

Implementa o fluxo completo de uma solicitação: criação, edição, envio e aprovação.
Usuários só acessam suas próprias solicitações (exceto papéis autorizados).
"""

import hashlib
from datetime import datetime
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction

from core.audit import log_audit
from apps.notifications.tasks import notify_approval_required, notify_decision_made
from .models import TravelRequest, TravelAuthorization, Destination
from .serializers import (
    TravelRequestListSerializer,
    TravelRequestDetailSerializer,
    TravelAuthorizationSerializer,
    DestinationSerializer,
)
from .filters import TravelRequestFilter
from .permissions import TravelRequestPermission


class TravelRequestViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de solicitações de viagem com controle de acesso por objeto.

    Regras de acesso:
    - REQUESTER: vê apenas suas próprias solicitações
    - SUPERVISOR: vê solicitações de sua equipe
    - TRAVEL_ANALYST/FINANCE/ADMIN: vê todas as solicitações
    """
    permission_classes = [IsAuthenticated, TravelRequestPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TravelRequestFilter
    search_fields = ['request_number', 'requester__full_name', 'destination__city', 'objective']
    ordering_fields = ['created_at', 'departure_date', 'status', 'estimated_daily_total']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filtra queryset conforme o perfil do usuário logado."""
        user_profile = self.request.user.profile
        role = user_profile.profile_role

        if role in ['TRAVEL_ANALYST', 'FINANCE', 'ADMIN']:
            # Acesso total
            return TravelRequest.objects.select_related(
                'requester', 'destination'
            ).all()
        elif role == 'SUPERVISOR':
            # Vê suas próprias + as de sua equipe
            subordinate_ids = user_profile.subordinates.values_list('id', flat=True)
            return TravelRequest.objects.select_related(
                'requester', 'destination'
            ).filter(
                requester__in=[user_profile.id, *subordinate_ids]
            )
        else:
            # REQUESTER: apenas suas próprias
            return TravelRequest.objects.select_related(
                'requester', 'destination'
            ).filter(requester=user_profile)

    def get_serializer_class(self):
        if self.action == 'list':
            return TravelRequestListSerializer
        return TravelRequestDetailSerializer

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """
        Envia a solicitação para aprovação.
        Transição de status: DRAFT → SUBMITTED.
        Dispara e-mail de notificação para o supervisor via Celery.
        """
        travel_request = self.get_object()

        if not travel_request.can_be_submitted:
            return Response(
                {'error': 'Solicitação não pode ser enviada no estado atual.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            travel_request.submit()

            # Cria registro de autorização pendente para o supervisor
            TravelAuthorization.objects.create(
                travel_request=travel_request,
                authorizer=travel_request.requester.supervisor or travel_request.requester,
                authorization_level=1,
                decision=TravelAuthorization.DecisionChoices.PENDING,
            )

        # Notifica supervisor de forma assíncrona (não bloqueia a resposta)
        if travel_request.requester.supervisor:
            notify_approval_required.delay(str(travel_request.id))

        return Response(
            TravelRequestDetailSerializer(travel_request, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancela a solicitação. Apenas o próprio solicitante pode cancelar."""
        travel_request = self.get_object()

        try:
            travel_request.cancel()
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            TravelRequestDetailSerializer(travel_request, context={'request': request}).data
        )

    def update(self, request, *args, **kwargs):
        """Edição permitida apenas em solicitações com status DRAFT."""
        travel_request = self.get_object()
        if not travel_request.can_be_edited:
            return Response(
                {'error': 'Apenas solicitações em rascunho podem ser editadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)


class TravelAuthorizationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints para aprovação e rejeição de solicitações.
    Apenas supervisores, diretores e admins têm acesso.
    """
    serializer_class = TravelAuthorizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_profile = self.request.user.profile
        return TravelAuthorization.objects.filter(
            authorizer=user_profile,
            decision=TravelAuthorization.DecisionChoices.PENDING,
        ).select_related('travel_request', 'travel_request__requester')

    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        """Lista solicitações pendentes de aprovação do usuário logado."""
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Aprova uma solicitação com assinatura eletrônica SHA-256.
        Hash = SHA256(travel_request_id + authorizer_id + timestamp + 'APPROVED')
        """
        authorization = self.get_object()

        with transaction.atomic():
            now = timezone.now()
            sig_input = (
                f"{authorization.travel_request_id}"
                f"{authorization.authorizer_id}"
                f"{now.isoformat()}"
                f"APPROVED"
            )
            signature = hashlib.sha256(sig_input.encode()).hexdigest()

            authorization.decision = TravelAuthorization.DecisionChoices.APPROVED
            authorization.digital_signature_hash = signature
            authorization.authorized_at = now
            authorization.ip_address = self._get_client_ip(request)
            authorization.user_agent = request.META.get('HTTP_USER_AGENT', '')
            authorization.save()

            # Atualiza status da solicitação
            travel_request = authorization.travel_request
            travel_request.status = TravelRequest.StatusChoices.APPROVED
            travel_request.save()

        # Notifica solicitante sobre aprovação
        notify_decision_made.delay(str(travel_request.id), 'APPROVED')

        return Response({'message': 'Solicitação aprovada com sucesso.', 'signature': signature})

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Rejeita a solicitação. Justificativa é obrigatória."""
        authorization = self.get_object()
        justification = request.data.get('justification', '').strip()

        if not justification:
            return Response(
                {'error': 'Justificativa é obrigatória ao rejeitar.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            now = timezone.now()
            sig_input = (
                f"{authorization.travel_request_id}"
                f"{authorization.authorizer_id}"
                f"{now.isoformat()}"
                f"REJECTED"
            )
            signature = hashlib.sha256(sig_input.encode()).hexdigest()

            authorization.decision = TravelAuthorization.DecisionChoices.REJECTED
            authorization.justification = justification
            authorization.digital_signature_hash = signature
            authorization.authorized_at = now
            authorization.ip_address = self._get_client_ip(request)
            authorization.save()

            travel_request = authorization.travel_request
            travel_request.status = TravelRequest.StatusChoices.REJECTED
            travel_request.save()

        notify_decision_made.delay(str(travel_request.id), 'REJECTED')

        return Response({'message': 'Solicitação rejeitada.', 'signature': signature})

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """Histórico completo de autorizações de uma solicitação."""
        authorization = self.get_object()
        history = TravelAuthorization.objects.filter(
            travel_request=authorization.travel_request
        ).order_by('created_at')
        serializer = self.get_serializer(history, many=True)
        return Response(serializer.data)

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class DestinationViewSet(viewsets.ReadOnlyModelViewSet):
    """Endpoint de destinos para autocomplete no formulário."""
    queryset = Destination.objects.filter()
    serializer_class = DestinationSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['city', 'state', 'country']
    pagination_class = None  # Retorna todos para uso em autocomplete
