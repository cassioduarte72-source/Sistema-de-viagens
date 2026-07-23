from django.contrib import admin
from .models import (
    Vehicle, Driver, VehicleAssignment, VehicleRequisition, VehicleChecklist,
)


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate', 'model', 'year', 'is_cargo', 'active')
    list_filter = ('active', 'is_cargo')
    search_fields = ('plate', 'model')


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('name', 'cnh_number', 'cnh_expiry', 'is_embrapa', 'active')
    list_filter = ('active', 'is_embrapa')
    search_fields = ('name', 'cnh_number')


@admin.register(VehicleAssignment)
class VehicleAssignmentAdmin(admin.ModelAdmin):
    list_display = ('travel_request', 'vehicle', 'driver')


@admin.register(VehicleRequisition)
class VehicleRequisitionAdmin(admin.ModelAdmin):
    list_display = ('number', 'travel_request', 'requester', 'status', 'created_at')
    list_filter = ('status', 'needs_driver')
    search_fields = ('number', 'travel_request__request_number', 'requester__full_name')
    readonly_fields = ('number',)


@admin.register(VehicleChecklist)
class VehicleChecklistAdmin(admin.ModelAdmin):
    list_display = ('requisition', 'kind', 'km', 'fuel_level', 'inspected_by', 'created_at')
    list_filter = ('kind',)
    search_fields = ('requisition__number',)
