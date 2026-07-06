"""
apps/fleet/views.py — CRUD de frota + agendas de ocupação.

As agendas replicam as grades 'Agenda Veículos' e 'Agenda Motoristas' do SAGU:
para um intervalo de datas, retornam os períodos ocupados por recurso,
prontos para o frontend pintar o calendário.
"""
from datetime import date, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Vehicle, Driver, VehicleAssignment, INACTIVE_TRIP_STATUSES
from .serializers import VehicleSerializer, DriverSerializer, VehicleAssignmentSerializer


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
