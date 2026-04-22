# -*- coding: utf-8 -*-

"""
installations app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"tasks", views.InstallationTaskViewSet, basename="installation-task")

urlpatterns = [
    path("", include(router.urls)),
    path("orders/search-address/", views.OrderAddressSearchView.as_view()),
]
