from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'registration_number', 'employee_type', 'profile_role', 'unit', 'is_active')
    list_filter = ('profile_role', 'employee_type', 'is_active', 'unit')
    search_fields = ('full_name', 'registration_number', 'email')
    autocomplete_fields = ('user', 'supervisor')
