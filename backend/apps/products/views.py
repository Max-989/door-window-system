"""
products app - 视图
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from common.responses import error

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
    permission_classes = [IsAuthenticated]
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["product_type", "status"]
    search_fields = ["name"]


class ProductCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer


class WoodProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = WoodProduct.objects.select_related("supplier").all()
    serializer_class = WoodProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["surface_process", "supplier", "status"]
    search_fields = ["name", "model"]


class AlloyProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = AlloyProduct.objects.select_related("supplier").all()
    serializer_class = AlloyProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["open_method", "track_type", "glass_type", "supplier", "status"]
    search_fields = ["name", "profile"]


class SecurityProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SecurityProduct.objects.select_related("supplier").all()
    serializer_class = SecurityProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["open_method", "size_type", "supplier", "status"]
    search_fields = ["name", "model"]


class HardwareViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Hardware.objects.select_related("supplier").all()
    serializer_class = HardwareSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["hardware_type", "sub_type", "supplier", "status"]
    search_fields = ["name", "model"]


class ProductSearchView(generics.ListAPIView):
    """产品搜索 API — 按 product_line 查对应产品表"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        product_line = request.query_params.get("product_line", "")
        q = request.query_params.get("q", "").strip()

        if product_line not in ("wood", "alloy", "security"):
            return error(message="product_line 必须为 wood / alloy / security", code=400)

        if product_line == "wood":
            qs = WoodProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            data = WoodProductSearchSerializer(qs[:50], many=True).data
        elif product_line == "alloy":
            qs = AlloyProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            data = AlloyProductSearchSerializer(qs[:50], many=True).data
        else:
            qs = SecurityProduct.objects.filter(status="on_sale")
            if q:
                qs = qs.filter(name__icontains=q)
            data = SecurityProductSearchSerializer(qs[:50], many=True).data

        return Response({"code": 200, "data": {"items": data}})
