# -*- coding: utf-8 -*-

"""
personnel app - 视图
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from .models import ContractModeSetting, Foreman, WageSettlement, WageStandard, Worker
from .serializers import (
    ContractModeSettingSerializer,
    ForemanSerializer,
    WageSettlementSerializer,
    WageStandardSerializer,
    WorkerCreateSerializer,
    WorkerDetailSerializer,
    WorkerListSerializer,
    WorkerUpdateSerializer,
)


class WorkerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """服务师傅管理"""
    queryset = Worker.objects.select_related(
        "foreman", "branch", "wage_standard", "user"
    ).all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["foreman", "branch", "city", "status"]
    search_fields = ["name", "phone"]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return WorkerListSerializer
        elif self.action == "create":
            return WorkerCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return WorkerUpdateSerializer
        return WorkerDetailSerializer


class ForemanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """工头管理"""
    queryset = Foreman.objects.select_related("branch", "user").all()
    serializer_class = ForemanSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["branch", "city", "status"]
    search_fields = ["name", "phone"]


class WageStandardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """工费标准管理"""
    queryset = WageStandard.objects.select_related("branch").all()
    serializer_class = WageStandardSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = [
        "skill_type",
        "billing_type",
        "branch",
        "product_line",
        "is_default",
    ]
    search_fields = ["name"]


class WageSettlementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """月结算记录"""
    queryset = WageSettlement.objects.select_related("worker", "confirmed_by").all()
    serializer_class = WageSettlementSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["worker", "month", "status"]
    search_fields = ["worker__name"]
    ordering_fields = ["month"]


class ContractModeSettingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """承包模式设置"""
    queryset = ContractModeSetting.objects.select_related("branch").all()
    serializer_class = ContractModeSettingSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["branch", "product_line", "contract_mode"]
