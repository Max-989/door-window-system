# -*- coding: utf-8 -*-

"""
maintenance app - URL配置
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"tasks", views.MaintenanceTaskViewSet, basename="maintenance-task")

urlpatterns = [
    path("", include(router.urls)),
]
