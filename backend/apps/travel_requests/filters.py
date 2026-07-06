"""apps/travel_requests/filters.py — Filtros de consulta para a listagem de SVs."""
import django_filters
from .models import TravelRequest


class TravelRequestFilter(django_filters.FilterSet):
    departure_after = django_filters.DateFilter(field_name='departure_date', lookup_expr='gte')
    departure_before = django_filters.DateFilter(field_name='departure_date', lookup_expr='lte')
    year = django_filters.NumberFilter(field_name='departure_date', lookup_expr='year')

    class Meta:
        model = TravelRequest
        fields = ['status', 'employee_type', 'cost_type', 'requester', 'destination', 'needs_flights']
