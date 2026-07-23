"""
apps/travel_requests/permissions.py — Controle de acesso por objeto.

REQUESTER: apenas suas próprias solicitações.
SUPERVISOR: suas próprias + as da equipe (subordinados diretos).
TRAVEL_ANALYST / FINANCE / ADMIN: leitura total; escrita apenas ADMIN.
"""
from rest_framework import permissions

# SIL = SLT (Logística/Transporte): enxerga as solicitações encaminhadas
ELEVATED_ROLES = ('TRAVEL_ANALYST', 'FINANCE', 'ADMIN', 'SIL')


class TravelRequestPermission(permissions.BasePermission):
    message = 'Você não tem permissão para acessar esta solicitação.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, 'profile')
        )

    def has_object_permission(self, request, view, obj):
        profile = request.user.profile
        role = profile.profile_role
        action = getattr(view, 'action', None)

        # Papéis elevados: leitura total; SOF/analista alteram status;
        # SLT conclui (lança no SDP) e informa o processo SEI
        if role in ELEVATED_ROLES:
            if request.method in permissions.SAFE_METHODS or role == 'ADMIN':
                return True
            return action in ('change_status', 'concluir_sdp', 'informar_sei', 'informar_empenho')

        # Dono da solicitação: acesso total (edição controlada pelo status na view)
        if obj.requester_id == profile.id:
            return True

        # Participante da viagem (favorecido): apenas leitura
        if request.method in permissions.SAFE_METHODS and \
                obj.beneficiaries.filter(full_name=profile.full_name).exists():
            return True

        # Supervisor da equipe: leitura + ações de decisão sobre o status
        if role == 'SUPERVISOR' and obj.requester.supervisor_id == profile.id:
            if request.method in permissions.SAFE_METHODS:
                return True
            return action == 'change_status'

        return False
