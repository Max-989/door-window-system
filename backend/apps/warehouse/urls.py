# -*- coding: utf-8 -*-

"""
warehouse app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"products", views.WarehouseProductViewSet)
router.register(r"hardware", views.HardwareInventoryViewSet)
router.register(r"accessories", views.AccessoryInventoryViewSet)
router.register(r"pending", views.PendingGoodsViewSet)
router.register(r"transfers", views.WarehouseTransferViewSet)
router.register(r"stocktake", views.StocktakeView, basename="stocktake")

urlpatterns = [
    path("", include(router.urls)),
]
