from rest_framework import serializers
from .models import (
    Vehicle, Driver, VehicleAssignment, VehicleRequisition, VehicleChecklist,
)


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = '__all__'


class VehicleAssignmentSerializer(serializers.ModelSerializer):
    vehicle_label = serializers.CharField(source='vehicle.__str__', read_only=True)
    driver_label = serializers.CharField(source='driver.__str__', read_only=True)
    request_number = serializers.CharField(
        source='travel_request.request_number', read_only=True,
    )
    period = serializers.SerializerMethodField()

    class Meta:
        model = VehicleAssignment
        fields = '__all__'

    def get_period(self, obj):
        t = obj.travel_request
        return {'start': t.departure_date, 'end': t.return_date}

    def validate(self, data):
        """Converte ValidationError de modelo em erro de API legível."""
        from django.core.exceptions import ValidationError as DjangoVE
        instance = VehicleAssignment(**{**(self.instance.__dict__ if self.instance else {}), **data})
        if self.instance:
            instance.pk = self.instance.pk
        try:
            instance.clean()
        except DjangoVE as e:
            raise serializers.ValidationError(e.message_dict)
        return data


class VehicleChecklistSerializer(serializers.ModelSerializer):
    """Check-list/vistoria de veículo (saída ou retorno)."""
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    fuel_level_display = serializers.CharField(source='get_fuel_level_display', read_only=True)
    inspected_by_name = serializers.CharField(source='inspected_by.full_name', read_only=True)

    class Meta:
        model = VehicleChecklist
        fields = '__all__'
        read_only_fields = ('requisition', 'inspected_by')


class VehicleRequisitionSerializer(serializers.ModelSerializer):
    """Requisição de veículo com rótulos legíveis para o frontend."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_number = serializers.CharField(
        source='travel_request.request_number', read_only=True,
    )
    requester_name = serializers.CharField(source='requester.full_name', read_only=True)
    assignment_detail = VehicleAssignmentSerializer(source='assignment', read_only=True)
    checklists = VehicleChecklistSerializer(many=True, read_only=True)
    allowed_transitions = serializers.SerializerMethodField()

    class Meta:
        model = VehicleRequisition
        fields = '__all__'
        # Campos governados pelo fluxo/servidor, não por escrita direta.
        # 'requester' é derivado da viagem no viewset (perform_create).
        read_only_fields = (
            'number', 'status', 'requester', 'assignment',
            'actual_km', 'negation_reason',
        )

    def get_allowed_transitions(self, obj):
        return obj.ALLOWED_TRANSITIONS.get(obj.status, [])
