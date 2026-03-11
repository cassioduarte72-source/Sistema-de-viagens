"""
apps/travel_requests/serializers.py — Serializers com validação de regras de negócio.

Toda validação de diárias e fluxo de status ocorre aqui,
nunca apenas no frontend (segurança e consistência).
"""

from datetime import date
from decimal import Decimal
from rest_framework import serializers
from django.utils import timezone
from core.models import SystemConfig
from apps.users.serializers import UserProfileSummarySerializer
from .models import TravelRequest, TravelAuthorization, Destination


class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = '__all__'


class TravelRequestListSerializer(serializers.ModelSerializer):
    """Serializer enxuto para listagens — evita over-fetching."""
    requester_name = serializers.CharField(source='requester.full_name', read_only=True)
    destination_label = serializers.CharField(source='destination.__str__', read_only=True)
    total_days = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TravelRequest
        fields = [
            'id', 'request_number', 'requester_name', 'destination_label',
            'departure_date', 'return_date', 'total_days', 'status',
            'status_display', 'employee_type', 'cost_type',
            'estimated_daily_total', 'needs_flights', 'created_at',
        ]


class TravelRequestDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para criação, edição e visualização de detalhes."""
    requester = UserProfileSummarySerializer(read_only=True)
    destination_detail = DestinationSerializer(source='destination', read_only=True)
    total_days = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_be_edited = serializers.BooleanField(read_only=True)

    class Meta:
        model = TravelRequest
        fields = '__all__'
        read_only_fields = [
            'id', 'request_number', 'status', 'submitted_at',
            'created_at', 'updated_at',
        ]

    def validate(self, data):
        """
        Valida regras de negócio da solicitação de viagem:
        1. Data de retorno deve ser após a data de saída
        2. Antecedência mínima de envio (configurável)
        3. Se sem ônus Embrapa, fonte de recursos é obrigatória
        4. Se solicita diárias, quantidade deve ser informada
        """
        departure = data.get('departure_date')
        return_date = data.get('return_date')
        cost_type = data.get('cost_type')
        needs_daily = data.get('needs_daily_allowance', False)
        daily_qty = data.get('daily_quantity')

        # Regra 1: datas consistentes
        if departure and return_date and return_date < departure:
            raise serializers.ValidationError(
                {'return_date': 'Data de retorno deve ser igual ou posterior à data de saída.'}
            )

        # Regra 2: antecedência mínima (padrão: 3 dias úteis)
        if departure:
            min_advance = int(SystemConfig.get_value('MIN_ADVANCE_DAYS', '3'))
            delta = (departure - date.today()).days
            if delta < min_advance:
                raise serializers.ValidationError(
                    {'departure_date': f'A viagem deve ser solicitada com pelo menos {min_advance} dias de antecedência.'}
                )

        # Regra 3: fonte de recursos obrigatória quando sem ônus Embrapa
        if cost_type == TravelRequest.CostType.NO_EMBRAPA_COST:
            if not data.get('funding_source'):
                raise serializers.ValidationError(
                    {'funding_source': 'Informe a fonte de recursos para viagens sem ônus Embrapa.'}
                )

        # Regra 4: quantidade de diárias obrigatória se solicitadas
        if needs_daily and not daily_qty:
            raise serializers.ValidationError(
                {'daily_quantity': 'Informe a quantidade de diárias solicitadas.'}
            )

        return data

    def validate_daily_quantity(self, value):
        """Diárias devem ser positivas e no máximo 0.5 de fração (meia diária)."""
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError('Quantidade de diárias deve ser positiva.')
            # Verifica se a fração é válida (inteiro ou .5)
            remainder = value % Decimal('0.5')
            if remainder != 0:
                raise serializers.ValidationError(
                    'Diárias devem ser em quantidades inteiras ou meias (ex: 1, 1.5, 2).'
                )
        return value

    def create(self, validated_data):
        """
        Ao criar, herda o employee_type do perfil do solicitante
        e calcula o total estimado de diárias automaticamente.
        """
        request = self.context['request']
        user_profile = request.user.profile
        validated_data['requester'] = user_profile
        # Desnormaliza tipo do funcionário do perfil
        validated_data['employee_type'] = user_profile.employee_type

        # Calcula total de diárias automaticamente (validação no backend)
        if validated_data.get('needs_daily_allowance') and validated_data.get('daily_quantity'):
            dest = validated_data.get('destination')
            rate = self._get_daily_rate(dest, validated_data.get('employee_type'))
            validated_data['estimated_daily_total'] = (
                Decimal(str(rate)) * validated_data['daily_quantity']
            )

        return super().create(validated_data)

    def _get_daily_rate(self, destination, employee_type):
        """
        Busca a taxa de diária aplicável:
        1. Tenta override do destino específico
        2. Verifica se é internacional
        3. Usa configuração global
        """
        if destination and destination.daily_rate_override:
            return destination.daily_rate_override
        if destination and destination.is_international:
            return Decimal(SystemConfig.get_value('DAILY_RATE_INTERNATIONAL', '1200.00'))
        return Decimal(SystemConfig.get_value('DAILY_RATE_NATIONAL', '756.02'))


class TravelAuthorizationSerializer(serializers.ModelSerializer):
    """Serializer para aprovação/rejeição com validação da assinatura eletrônica."""
    authorizer_name = serializers.CharField(source='authorizer.full_name', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)

    class Meta:
        model = TravelAuthorization
        fields = [
            'id', 'travel_request', 'authorizer', 'authorizer_name',
            'authorization_level', 'decision', 'decision_display',
            'justification', 'digital_signature_hash', 'authorized_at',
            'ip_address',
        ]
        read_only_fields = ['id', 'digital_signature_hash', 'authorized_at', 'ip_address']

    def validate(self, data):
        """Justificativa é obrigatória quando a decisão é REJECTED."""
        if data.get('decision') == TravelAuthorization.DecisionChoices.REJECTED:
            if not data.get('justification', '').strip():
                raise serializers.ValidationError(
                    {'justification': 'Justificativa é obrigatória ao rejeitar uma solicitação.'}
                )
        return data
