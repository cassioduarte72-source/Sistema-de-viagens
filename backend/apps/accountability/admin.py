from django.contrib import admin
from .models import AccountabilityReport


@admin.register(AccountabilityReport)
class AccountabilityReportAdmin(admin.ModelAdmin):
    list_display = ('travel_request', 'submitted_by', 'status', 'total_daily_received', 'total_daily_spent')
    list_filter = ('status',)
    search_fields = ('travel_request__request_number',)
