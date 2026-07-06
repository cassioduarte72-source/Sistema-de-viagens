from django.contrib import admin
from .models import Vehicle, Driver, VehicleAssignment


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
