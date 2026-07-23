from django.contrib import admin
from .models import AccountabilityReport, ExpenseItem, AccountabilityRouting


class ExpenseItemInline(admin.TabularInline):
    model = ExpenseItem
    extra = 0


class RoutingInline(admin.TabularInline):
    model = AccountabilityRouting
    extra = 0
    readonly_fields = ('action', 'responsible', 'note', 'created_at')


@admin.register(AccountabilityReport)
class AccountabilityReportAdmin(admin.ModelAdmin):
    list_display = ('travel_request', 'submitted_by', 'status', 'advance_received', 'commitment_number')
    list_filter = ('status',)
    search_fields = ('travel_request__request_number',)
    inlines = [ExpenseItemInline, RoutingInline]


@admin.register(ExpenseItem)
class ExpenseItemAdmin(admin.ModelAdmin):
    list_display = ('report', 'item_type', 'description', 'proven_value', 'approved_value')
    list_filter = ('item_type',)
