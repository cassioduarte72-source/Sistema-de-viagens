"""apps/users/views.py — Endpoints de perfil do usuário autenticado."""
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Favorecido
from .serializers import UserProfileDetailSerializer, FavorecidoSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Retorna o perfil completo do usuário logado (usado pelo frontend após login)."""
    return Response(UserProfileDetailSerializer(request.user.profile).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def favorecidos_search(request):
    """
    Busca de favorecidos por nome ou matrícula (representa o banco do SAGU).
    Usado pelo campo 'Favorecido' da solicitação. Exige ao menos 2 caracteres.
    """
    q = request.query_params.get('q', '').strip()
    tipo = request.query_params.get('tipo', '').strip()  # EMPLOYEE | COLLABORATOR
    if len(q) < 2:
        return Response([])
    qs = Favorecido.objects.filter(active=True)
    if tipo in (Favorecido.PersonType.EMPLOYEE, Favorecido.PersonType.COLLABORATOR):
        qs = qs.filter(person_type=tipo)
    qs = qs.filter(
        Q(full_name__icontains=q) | Q(registration_number__icontains=q)
    )[:20]
    return Response(FavorecidoSerializer(qs, many=True).data)
