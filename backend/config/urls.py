"""config/urls.py — Rotas da API v1 do SAV."""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.users.views import me
from apps.travel_requests.views import (
    TravelRequestViewSet,
    TravelAuthorizationViewSet,
    DestinationViewSet,
)
from apps.accountability.views import AccountabilityReportViewSet
from apps.travel_requests.views import (
    TravelBeneficiaryViewSet, BudgetAllocationViewSet,
    ResearchProjectViewSet, FundingAgencyViewSet,
)
from apps.fleet.views import VehicleViewSet, DriverViewSet, VehicleAssignmentViewSet
from apps.travel_requests.views import (
    SponsorViewSet, ResourceLineViewSet, FlightTicketViewSet,
)

router = DefaultRouter()
router.register(r'travel-requests', TravelRequestViewSet, basename='travel-request')
router.register(r'authorizations', TravelAuthorizationViewSet, basename='authorization')
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'accountability', AccountabilityReportViewSet, basename='accountability')
router.register(r'beneficiaries', TravelBeneficiaryViewSet, basename='beneficiary')
router.register(r'budget-allocations', BudgetAllocationViewSet, basename='budget-allocation')
router.register(r'projects', ResearchProjectViewSet, basename='project')
router.register(r'funding-agencies', FundingAgencyViewSet, basename='funding-agency')
router.register(r'fleet/vehicles', VehicleViewSet, basename='vehicle')
router.register(r'fleet/drivers', DriverViewSet, basename='driver')
router.register(r'fleet/assignments', VehicleAssignmentViewSet, basename='assignment')
router.register(r'sponsors', SponsorViewSet, basename='sponsor')
router.register(r'resource-lines', ResourceLineViewSet, basename='resource-line')
router.register(r'tickets', FlightTicketViewSet, basename='ticket')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/token/', TokenObtainPairView.as_view(), name='token_obtain'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/users/me/', me, name='users-me'),
    path('api/v1/', include(router.urls)),
]
