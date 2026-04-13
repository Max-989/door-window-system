"""
decoration app - 视图
"""
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated

from .models import Brand, DecorationStaff, Store
from .serializers import BrandSerializer, DecorationStaffSerializer, StoreSerializer


class BrandViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["status"]
    search_fields = ["name"]


class StoreViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Store.objects.select_related("brand").all()
    serializer_class = StoreSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["brand", "status"]
    search_fields = ["name", "address"]


class DecorationStaffViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = DecorationStaff.objects.select_related("store", "store__brand").all()
    serializer_class = DecorationStaffSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["store", "role", "status"]
    search_fields = ["name", "phone"]
