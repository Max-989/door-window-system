# -*- coding: utf-8 -*-

"""
products app - 视图
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from common.responses import error
from common.pagination import StandardPagination

from .models import (
    AlloyProduct,
    Hardware,
    ProductCategory,
    SecurityProduct,
    Supplier,
    WoodProduct,
)
from .serializers import (
    AlloyProductSearchSerializer,
    AlloyProductSerializer,
    HardwareSerializer,
    ProductCategorySerializer,
    SecurityProductSearchSerializer,
    SecurityProductSerializer,
    SupplierSerializer,
    WoodProductSearchSerializer,
    WoodProductSerializer,
)


class SupplierViewSet(viewsets.ModelViewSet):
    """供应商管理"""

    permission_classes = [IsAuthenticated]
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["product_type", "status"]
    search_fields = ["name"]


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """产品分类管理"""

    permission_classes = [IsAuthenticated]
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class WoodProductViewSet(viewsets.ModelViewSet):
    """木门产品管理"""

    permission_classes = [IsAuthenticated]
    queryset = WoodProduct.objects.select_related("supplier").all()
    serializer_class = WoodProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["surface_process", "supplier", "status"]
    search_fields = ["name", "model"]


class AlloyProductViewSet(viewsets.ModelViewSet):
    """合金门产品管理"""

    permission_classes = [IsAuthenticated]
    queryset = AlloyProduct.objects.select_related("supplier").all()
    serializer_class = AlloyProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["open_method", "track_type", "glass_type", "supplier", "status"]
    search_fields = ["name", "profile"]


class SecurityProductViewSet(viewsets.ModelViewSet):
    """安防门产品管理"""

    permission_classes = [IsAuthenticated]
    queryset = SecurityProduct.objects.select_related("supplier").all()
    serializer_class = SecurityProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["open_method", "size_type", "supplier", "status"]
    search_fields = ["name", "model"]


class HardwareViewSet(viewsets.ModelViewSet):
    """五金配件管理"""

    permission_classes = [IsAuthenticated]
    queryset = Hardware.objects.select_related("supplier").all()
    serializer_class = HardwareSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hardware_type", "sub_type", "supplier", "status"]
    search_fields = ["name", "model"]


class ProductSearchView(generics.ListAPIView):
    """产品搜索 API — 按 product_line 查对应产品表"""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        product_line = self.request.query_params.get("product_line", "")
        q = self.request.query_params.get("q", "").strip()

        if product_line == "wood":
            qs = WoodProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            return qs
        elif product_line == "alloy":
            qs = AlloyProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            return qs
        elif product_line == "security":
            qs = SecurityProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            return qs
        else:
            # Return empty queryset; validation will be handled in get_serializer_class
            return WoodProduct.objects.none()

    def get_serializer_class(self):
        product_line = self.request.query_params.get("product_line", "")
        if product_line == "wood":
            return WoodProductSearchSerializer
        elif product_line == "alloy":
            return AlloyProductSearchSerializer
        elif product_line == "security":
            return SecurityProductSearchSerializer
        else:
            # Default to wood serializer; validation will raise error in list method
            return WoodProductSearchSerializer

    def list(self, request, *args, **kwargs):
        product_line = request.query_params.get("product_line", "")
        if product_line not in ("wood", "alloy", "security"):
            return error(
                message="product_line 必须为 wood / alloy / security", code=400
            )
        return super().list(request, *args, **kwargs)
