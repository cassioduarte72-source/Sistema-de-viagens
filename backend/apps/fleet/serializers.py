from rest_framework import serializers
from .models import Vehicle, Driver, VehicleAssignment


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
