"""
measurements app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"tasks", views.MeasurementTaskViewSet, basename="measurement-task")

urlpatterns = [
    path("", include(router.urls)),
    path("order-products/", views.OrderProductsView.as_view()),
]
