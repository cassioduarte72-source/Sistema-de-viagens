"""apps/accountability/serializers.py"""
from rest_framework import serializers
from apps.users.serializers import UserProfileSummarySerializer
from .models import AccountabilityReport


class AccountabilityReportSerializer(serializers.ModelSerializer):
    submitted_by = UserProfileSummarySerializer(read_only=True)
    request_number = serializers.CharField(
        source='travel_request.request_number', read_only=True,
    )
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    requires_refund = serializers.BooleanField(read_only=True)
    requires_complement = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AccountabilityReport
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]

    def validate(self, data):
        dep = data.get('actual_departure_date')
        ret = data.get('actual_return_date')
        if dep and ret and ret < dep:
            raise serializers.ValidationError(
                {'actual_return_date': 'Retorno efetivo deve ser igual ou posterior à saída efetiva.'}
            )
        return data
