from django.urls import path, include

urlpatterns = [
    path('admin/', __import__('django.contrib.admin', fromlist=['site']).site.urls),
]
