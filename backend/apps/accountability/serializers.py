"""apps/accountability/serializers.py"""
from rest_framework import serializers
from apps.users.serializers import UserProfileSummarySerializer
from .models import AccountabilityReport, ExpenseItem, AccountabilityRouting


class ExpenseItemSerializer(serializers.ModelSerializer):
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)

    class Meta:
        model = ExpenseItem
        fields = '__all__'


class AccountabilityRoutingSerializer(serializers.ModelSerializer):
    responsible_name = serializers.CharField(source='responsible.full_name', read_only=True)

    class Meta:
        model = AccountabilityRouting
        fields = ['id', 'action', 'responsible_name', 'note', 'created_at']


class AccountabilityReportSerializer(serializers.ModelSerializer):
    submitted_by = UserProfileSummarySerializer(read_only=True)
    request_number = serializers.CharField(
        source='travel_request.request_number', read_only=True,
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    expense_items = ExpenseItemSerializer(many=True, read_only=True)
    routings = AccountabilityRoutingSerializer(many=True, read_only=True)

    # Dados da viagem (cabeçalho da PCV)
    trip = serializers.SerializerMethodField()
    # Totais da PCV (modelo SDP)
    total_diarias = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_despesas_aprovadas = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    valor_total_viagem = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    valor_a_devolver = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    valor_a_receber = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    def get_trip(self, obj):
        from datetime import timedelta
        from core.models import SystemConfig
        t = obj.travel_request
        prazo = int(SystemConfig.get_value('PCV_DEADLINE_DAYS', '5'))
        return {
            'id': str(t.id),
            'request_number': t.request_number,
            'favorecido': (t.beneficiaries.first().full_name if t.beneficiaries.exists() else t.requester.full_name),
            'roteiro': t.itinerary,
            'objetivo': t.objective,
            'departure_date': t.departure_date,
            'return_date': t.return_date,
            'vencimento_pcv': (t.return_date + timedelta(days=prazo)) if t.return_date else None,
            'sei_process': t.sei_process,
            'empenho': t.commitment_number,
        }

    class Meta:
        model = AccountabilityReport
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'submitted_at', 'reviewed_by', 'reviewed_at',
            'commitment_number', 'created_at', 'updated_at',
        ]

    def validate(self, data):
        dep = data.get('actual_departure_date')
        ret = data.get('actual_return_date')
        if dep and ret and ret < dep:
            raise serializers.ValidationError(
                {'actual_return_date': 'Retorno efetivo deve ser igual ou posterior à saída efetiva.'}
            )
        return data
