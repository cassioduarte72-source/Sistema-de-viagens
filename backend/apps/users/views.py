"""apps/users/views.py — Endpoints de perfil do usuário autenticado."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import UserProfileDetailSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Retorna o perfil completo do usuário logado (usado pelo frontend após login)."""
    return Response(UserProfileDetailSerializer(request.user.profile).data)
