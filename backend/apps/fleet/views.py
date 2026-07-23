"""
apps/fleet/views.py — CRUD de frota + agendas de ocupação.

As agendas replicam as grades 'Agenda Veículos' e 'Agenda Motoristas' do SAGU:
para um intervalo de datas, retornam os períodos ocupados por recurso,
prontos para o frontend pintar o calendário.
"""
from datetime import date, timedelta
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Vehicle, Driver, VehicleAssignment, VehicleRequisition, VehicleChecklist,
    INACTIVE_TRIP_STATUSES,
)
from .serializers import (
    VehicleSerializer, DriverSerializer, VehicleAssignmentSerializer,
    VehicleRequisitionSerializer, VehicleChecklistSerializer,
)


def _parse_range(request):
    """Intervalo padrão: hoje + 30 dias."""
    try:
        start = date.fromisoformat(request.query_params.get('start', ''))
    except ValueError:
        start = date.today()
    try:
        end = date.fromisoformat(request.query_params.get('end', ''))
    except ValueError:
        end = start + timedelta(days=30)
    return start, end


def _busy_periods(assignments):
    return [
        {
            'travel': a.travel_request.request_number,
            'start': a.travel_request.departure_date,
            'end': a.travel_request.return_date,
            'status': a.travel_request.status,
        }
        for a in assignments
    ]


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['active', 'is_cargo']

    @action(detail=False, methods=['get'], url_path='agenda')
    def agenda(self, request):
        """Ocupação de todos os veículos ativos no intervalo (?start=&end=)."""
        start, end = _parse_range(request)
        result = []
        for vehicle in Vehicle.objects.filter(active=True):
            assignments = (
                vehicle.assignments
                .exclude(travel_request__status__in=INACTIVE_TRIP_STATUSES)
                .filter(
                    travel_request__departure_date__lte=end,
                    travel_request__return_date__gte=start,
                )
                .select_related('travel_request')
            )
            result.append({
                'vehicle': str(vehicle),
                'vehicle_id': str(vehicle.id),
                'busy': _busy_periods(assignments),
            })
        return Response({'start': start, 'end': end, 'vehicles': result})


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['active', 'is_embrapa']

    @action(detail=False, methods=['get'], url_path='agenda')
    def agenda(self, request):
        """Ocupação de todos os motoristas ativos no intervalo (?start=&end=)."""
        start, end = _parse_range(request)
        result = []
        for driver in Driver.objects.filter(active=True):
            assignments = (
                driver.assignments
                .exclude(travel_request__status__in=INACTIVE_TRIP_STATUSES)
                .filter(
                    travel_request__departure_date__lte=end,
                    travel_request__return_date__gte=start,
                )
                .select_related('travel_request')
            )
            result.append({
                'driver': str(driver),
                'driver_id': str(driver.id),
                'busy': _busy_periods(assignments),
            })
        return Response({'start': start, 'end': end, 'drivers': result})


class VehicleAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['travel_request', 'vehicle', 'driver']

    def get_queryset(self):
        return VehicleAssignment.objects.select_related(
            'vehicle', 'driver', 'travel_request',
        )


class VehicleRequisitionViewSet(viewsets.ModelViewSet):
    """
    Requisição de Veículo — orquestra o fluxo do fluxograma via ações:
    enviar ao CHADM, remeter ao SIL, negar, reservar, iniciar uso, fechar, cancelar.
    Cada ação valida o papel do usuário e a transição de status permitida.
    """
    serializer_class = VehicleRequisitionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'travel_request', 'requester']

    ADMIN = 'ADMIN'

    def get_queryset(self):
        return VehicleRequisition.objects.select_related(
            'travel_request', 'requester', 'assignment__vehicle', 'assignment__driver',
        ).prefetch_related('checklists__inspected_by')

    def perform_create(self, serializer):
        """O solicitante da requisição é sempre o solicitante da viagem (como no SDP)."""
        travel = serializer.validated_data['travel_request']
        serializer.save(requester=travel.requester)

    def perform_destroy(self, instance):
        """Ao excluir a requisição, libera a alocação de veículo/motorista associada."""
        assignment = instance.assignment
        instance.delete()
        if assignment:
            assignment.delete()

    def _fresh(self, obj):
        """Re-consulta o objeto (evita cache de prefetch desatualizado nas respostas)."""
        return self.get_serializer(self.get_queryset().get(pk=obj.pk)).data

    # ─── Helpers ────────────────────────────────────────────────────────────
    def _role(self):
        profile = getattr(self.request.user, 'profile', None)
        return getattr(profile, 'profile_role', None)

    def _require_role(self, *roles):
        """Garante que o usuário tem um dos papéis (ADMIN sempre autorizado)."""
        role = self._role()
        if role != self.ADMIN and role not in roles:
            raise PermissionDenied(
                f'Ação restrita ao papel: {", ".join(roles)}.'
            )

    def _run(self, method, *args, **kwargs):
        """Executa a transição e converte erro de modelo em 400 legível."""
        obj = self.get_object()
        try:
            getattr(obj, method)(*args, **kwargs)
        except DjangoValidationError as e:
            raise ValidationError(getattr(e, 'messages', [str(e)]))
        return Response(self.get_serializer(obj).data)

    # ─── Ações do fluxo ─────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='enviar-chadm')
    def send_to_chadm(self, request, pk=None):
        """Passo 4 (SOF): envia a requisição ao CHADM."""
        self._require_role('FINANCE')
        return self._run('send_to_chadm')

    @action(detail=True, methods=['post'], url_path='remeter-sil')
    def remit_to_sil(self, request, pk=None):
        """Passo 9 (CHADM): há recursos → remete ao SIL."""
        self._require_role('CHADM')
        return self._run('remit_to_sil')

    @action(detail=True, methods=['post'], url_path='negar')
    def negate(self, request, pk=None):
        """Passos 6–7 (CHADM): nega por falta de recurso, com justificativa."""
        self._require_role('CHADM')
        return self._run('negate', reason=request.data.get('reason', ''))

    @action(detail=True, methods=['post'], url_path='reservar')
    def reserve(self, request, pk=None):
        """Passos 14–15 (SIL): reserva veículo e designa motorista (opcional)."""
        self._require_role('SIL')
        vehicle = self._get_related(Vehicle, request.data.get('vehicle_id'), 'vehicle_id')
        driver = None
        if request.data.get('driver_id'):
            driver = self._get_related(Driver, request.data.get('driver_id'), 'driver_id')
        return self._run('reserve', vehicle=vehicle, driver=driver,
                         notes=request.data.get('notes', ''))

    @action(detail=True, methods=['post'], url_path='checklist')
    def checklist(self, request, pk=None):
        """Passos 17/18/22 (SIL): registra (ou atualiza) o check-list de saída/retorno."""
        self._require_role('SIL')
        req = self.get_object()
        kind = request.data.get('kind')
        if kind not in (VehicleChecklist.Kind.INITIAL, VehicleChecklist.Kind.FINAL):
            raise ValidationError({'kind': 'Informe kind = INITIAL (saída) ou FINAL (retorno).'})
        data = {k: v for k, v in request.data.items() if k != 'kind'}
        serializer = VehicleChecklistSerializer(
            instance=req.checklists.filter(kind=kind).first(),
            data=data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(
            requisition=req, kind=kind,
            inspected_by=getattr(request.user, 'profile', None),
        )
        return Response(self._fresh(req))

    @action(detail=True, methods=['post'], url_path='iniciar-uso')
    def start_use(self, request, pk=None):
        """Passos 20/21 (SIL): veículo retirado, entra em uso."""
        self._require_role('SIL')
        return self._run('start_use')

    @action(detail=True, methods=['post'], url_path='fechar')
    def close(self, request, pk=None):
        """Passo 24 (SIL): fecha a requisição com a KM real."""
        self._require_role('SIL')
        actual_km = request.data.get('actual_km')
        return self._run('close', actual_km=int(actual_km) if actual_km else None)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancel(self, request, pk=None):
        """Passo 12 (SIL): cancela a requisição."""
        self._require_role('SIL')
        return self._run('cancel')

    def _get_related(self, model, pk, field):
        if not pk:
            raise ValidationError({field: 'Campo obrigatório.'})
        try:
            return model.objects.get(pk=pk)
        except model.DoesNotExist:
            raise ValidationError({field: 'Registro não encontrado.'})
