"""apps/users/serializers.py — Serializers de perfil de usuário."""
from rest_framework import serializers
from .models import UserProfile, Favorecido


class UserProfileSummarySerializer(serializers.ModelSerializer):
    """Versão resumida para embutir em outras respostas (evita over-fetching)."""
    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'email', 'registration_number',
            'employee_type', 'profile_role', 'unit',
        ]


class FavorecidoSerializer(serializers.ModelSerializer):
    """Pessoa buscada no cadastro do SAGU para o campo Favorecido."""
    person_type_display = serializers.CharField(source='get_person_type_display', read_only=True)

    class Meta:
        model = Favorecido
        fields = [
            'id', 'full_name', 'person_type', 'person_type_display',
            'registration_number', 'cpf', 'email',
            'unit', 'position', 'chief_name', 'address', 'bank_info',
        ]


class UserProfileDetailSerializer(serializers.ModelSerializer):
    supervisor = UserProfileSummarySerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'username', 'full_name', 'email', 'registration_number',
            'employee_type', 'profile_role', 'unit', 'sector', 'phone',
            'supervisor', 'is_active', 'created_at',
        ]
