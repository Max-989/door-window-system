# -*- coding: utf-8 -*-

"""
orders app - URL配置
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"orders/items", views.OrderItemViewSet, basename="order-item")
router.register(
    r"orders/change-logs", views.OrderChangeLogViewSet, basename="order-change-log"
)
router.register(r"orders", views.OrderViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
