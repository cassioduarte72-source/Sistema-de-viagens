from django.contrib import admin
from .models import (
    TravelRequest, TravelAuthorization, Destination, ResearchActivity, TravelAdvance,
)


@admin.register(ResearchActivity)
class ResearchActivityAdmin(admin.ModelAdmin):
    list_display = ('code', 'description', 'responsible', 'balance', 'active')
    list_filter = ('active',)
    search_fields = ('code', 'description', 'responsible')


@admin.register(TravelAdvance)
class TravelAdvanceAdmin(admin.ModelAdmin):
    list_display = ('travel_request', 'nature', 'value')
    list_filter = ('nature',)


@admin.register(TravelRequest)
class TravelRequestAdmin(admin.ModelAdmin):
    list_display = ('request_number', 'requester', 'destination', 'departure_date', 'status', 'estimated_daily_total')
    list_filter = ('status', 'employee_type', 'cost_type')
    search_fields = ('request_number', 'requester__full_name', 'destination__city')
    date_hierarchy = 'departure_date'
    readonly_fields = ('request_number', 'submitted_at')


@admin.register(TravelAuthorization)
class TravelAuthorizationAdmin(admin.ModelAdmin):
    list_display = ('travel_request', 'authorizer', 'authorization_level', 'decision', 'authorized_at')
    list_filter = ('decision', 'authorization_level')
    readonly_fields = ('digital_signature_hash', 'ip_address', 'user_agent')


@admin.register(Destination)
class DestinationAdmin(admin.ModelAdmin):
    list_display = ('city', 'state', 'country', 'is_international', 'daily_rate_override')
    list_filter = ('is_international', 'state')
    search_fields = ('city',)
