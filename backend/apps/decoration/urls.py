# -*- coding: utf-8 -*-

"""
decoration app - URL配置
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"brands", views.BrandViewSet)
router.register(r"stores", views.StoreViewSet)
router.register(r"staff", views.DecorationStaffViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
