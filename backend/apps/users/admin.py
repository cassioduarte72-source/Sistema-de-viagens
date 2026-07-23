from django.contrib import admin
from .models import UserProfile, Favorecido


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'registration_number', 'employee_type', 'profile_role', 'unit', 'is_active')
    list_filter = ('profile_role', 'employee_type', 'is_active', 'unit')
    search_fields = ('full_name', 'registration_number', 'email')
    autocomplete_fields = ('user', 'supervisor')


@admin.register(Favorecido)
class FavorecidoAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'person_type', 'registration_number', 'unit', 'blocked', 'active')
    list_filter = ('person_type', 'blocked', 'active', 'unit')
    search_fields = ('full_name', 'registration_number', 'cpf', 'email')
    list_editable = ('blocked',)  # permite desbloquear manualmente (regularizar)
