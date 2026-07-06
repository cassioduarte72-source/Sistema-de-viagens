"""apps/users/serializers.py — Serializers de perfil de usuário."""
from rest_framework import serializers
from .models import UserProfile


class UserProfileSummarySerializer(serializers.ModelSerializer):
    """Versão resumida para embutir em outras respostas (evita over-fetching)."""
    class Meta:
        model = UserProfile
        fields = [
            'id', 'full_name', 'email', 'registration_number',
            'employee_type', 'profile_role', 'unit',
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
