"""
apps/users/models.py — Perfil de usuário do SAV.

Estende o User padrão do Django (autenticação) com dados funcionais da Embrapa:
matrícula, vínculo, papel no sistema e cadeia hierárquica (supervisor).
"""
from django.contrib.auth.models import User
from django.db import models
from core.models import BaseModel


class UserProfile(BaseModel):
    """Perfil funcional vinculado 1:1 ao usuário de autenticação."""

    class EmployeeType(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Empregado'
        COLLABORATOR = 'COLLABORATOR', 'Colaborador'

    class ProfileRole(models.TextChoices):
        REQUESTER = 'REQUESTER', 'Solicitante'
        SUPERVISOR = 'SUPERVISOR', 'Supervisor'
        TRAVEL_ANALYST = 'TRAVEL_ANALYST', 'Analista de Viagens'
        FINANCE = 'FINANCE', 'Financeiro (SOF)'
        CHADM = 'CHADM', 'CHADM (Recursos)'
        SIL = 'SIL', 'SLT (Logística e Transporte)'
        DIRECTOR = 'DIRECTOR', 'Diretor / Ordenador'
        ADMIN = 'ADMIN', 'Administrador'

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='profile', verbose_name='Usuário',
    )
    full_name = models.CharField(max_length=200, verbose_name='Nome Completo')
    email = models.EmailField(verbose_name='E-mail Institucional')
    registration_number = models.CharField(
        max_length=30, unique=True, verbose_name='Matrícula',
    )
    employee_type = models.CharField(
        max_length=20, choices=EmployeeType.choices,
        default=EmployeeType.EMPLOYEE, verbose_name='Tipo de Vínculo',
    )
    profile_role = models.CharField(
        max_length=20, choices=ProfileRole.choices,
        default=ProfileRole.REQUESTER, verbose_name='Papel no Sistema',
    )
    unit = models.CharField(max_length=100, blank=True, verbose_name='Unidade (UG)')
    sector = models.CharField(max_length=100, blank=True, verbose_name='Setor')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefone')
    supervisor = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='subordinates',
        verbose_name='Supervisor Imediato',
    )
    is_active = models.BooleanField(default=True, verbose_name='Ativo')

    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'Perfil de Usuário'
        verbose_name_plural = 'Perfis de Usuários'
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['profile_role']),
            models.Index(fields=['registration_number']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.registration_number})'

    @property
    def is_approver(self) -> bool:
        return self.profile_role in (
            self.ProfileRole.SUPERVISOR,
            self.ProfileRole.DIRECTOR,
            self.ProfileRole.ADMIN,
        )


class Favorecido(BaseModel):
    """
    Cadastro de pessoas (favorecidos) — representa o banco de pessoas do SAGU,
    do qual o campo 'Favorecido' da solicitação é buscado. Enquanto o SAV opera
    como módulo do SAGU sem integração direta ao banco, esta tabela é a fonte;
    depois basta trocar a origem da busca para o SAGU real.
    """
    class PersonType(models.TextChoices):
        EMPLOYEE = 'EMPLOYEE', 'Empregado'
        COLLABORATOR = 'COLLABORATOR', 'Colaborador'

    full_name = models.CharField(max_length=200, verbose_name='Nome')
    person_type = models.CharField(
        max_length=20, choices=PersonType.choices,
        default=PersonType.EMPLOYEE, verbose_name='Vínculo',
    )
    registration_number = models.CharField(max_length=30, blank=True, verbose_name='Matrícula')
    cpf = models.CharField(max_length=14, blank=True, verbose_name='CPF')
    email = models.EmailField(blank=True, verbose_name='E-mail')
    unit = models.CharField(max_length=120, blank=True, verbose_name='Unidade')
    position = models.CharField(max_length=120, blank=True, verbose_name='Cargo')
    chief_name = models.CharField(max_length=200, blank=True, verbose_name='Chefe (Ordenador)')
    address = models.CharField(max_length=255, blank=True, verbose_name='Endereço')
    bank_info = models.CharField(max_length=120, blank=True, verbose_name='Dados Bancários')
    active = models.BooleanField(default=True, verbose_name='Ativo')
    # Bloqueio por inadimplência na prestação de contas (não pode nova viagem)
    blocked = models.BooleanField(default=False, verbose_name='Bloqueado (inadimplente)')
    blocked_reason = models.CharField(max_length=255, blank=True, verbose_name='Motivo do Bloqueio')

    class Meta:
        db_table = 'favorecidos'
        verbose_name = 'Favorecido (SAGU)'
        verbose_name_plural = 'Favorecidos (SAGU)'
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['full_name']),
            models.Index(fields=['registration_number']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.registration_number})'
