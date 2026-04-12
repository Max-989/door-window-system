"""
products app - URL配置
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"suppliers", views.SupplierViewSet)
router.register(r"categories", views.ProductCategoryViewSet)
router.register(r"wood", views.WoodProductViewSet)
router.register(r"alloy", views.AlloyProductViewSet)
router.register(r"security", views.SecurityProductViewSet)
router.register(r"hardware", views.HardwareViewSet)

urlpatterns = [
    path("search/", views.ProductSearchView.as_view(), name="product-search"),
    path("", include(router.urls)),
]
