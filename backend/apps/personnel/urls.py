# -*- coding: utf-8 -*-

"""
personnel app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"workers", views.WorkerViewSet)
router.register(r"foremen", views.ForemanViewSet)
router.register(r"wage-standards", views.WageStandardViewSet)
router.register(r"settlements", views.WageSettlementViewSet)
router.register(r"contract-modes", views.ContractModeSettingViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
