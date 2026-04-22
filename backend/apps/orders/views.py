# -*- coding: utf-8 -*-

"""
orders app - 视图
"""

import openpyxl
from django_filters import rest_framework as filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.enums import OrderStatus
from common.utils import generate_order_no

from .models import Order, OrderChangeLog, OrderItem
from .serializers import (
    OrderBulkImportSerializer,
    OrderChangeLogSerializer,
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderItemSerializer,
    OrderListSerializer,
    OrderUpdateSerializer,
)


class OrderFilterSet(filters.FilterSet):
    """订单筛选"""

    city = filters.CharFilter(field_name="city", lookup_expr="exact", help_text="城市")
    brand = filters.NumberFilter(field_name="brand", help_text="品牌ID")
    product_line = filters.CharFilter(field_name="product_line", help_text="品类/产品线")
    time_field = filters.CharFilter(
        method="filter_time_field", help_text="时间字段：created_at/installation_time"
    )
    time_start = filters.DateTimeFilter(method="filter_time_range", help_text="开始时间")
    time_end = filters.DateTimeFilter(method="filter_time_range", help_text="结束时间")

    class Meta:
        model = Order
        fields = [
            "source",
            "brand",
            "store",
            "order_type",
            "product_line",
            "status",
            "branch",
        ]

    def filter_time_field(self, queryset, name, value):
        """记录时间字段选择，不直接过滤"""
        self._time_field = value
        return queryset

    def filter_time_range(self, queryset, name, value):
        """根据time_field和时间范围过滤"""
        time_field = getattr(self, "_time_field", "created_at")
        valid_fields = {"created_at", "installation_time"}
        if time_field not in valid_fields:
            time_field = "created_at"
        if name == "time_start" and value:
            lookup = f"{time_field}__gte"
            return queryset.filter(**{lookup: value})
        if name == "time_end" and value:
            lookup = f"{time_field}__lte"
            return queryset.filter(**{lookup: value})
        return queryset


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """订单管理"""
    queryset = Order.objects.select_related(
        "brand", "store", "salesperson", "branch", "created_by"
    ).prefetch_related("items")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OrderFilterSet
    search_fields = ["order_no", "customer_name", "customer_phone", "customer_address"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        # 装企人员：只看关联门店的订单
        try:
            profile = user.profile
            if profile.user_type == "decoration" and profile.status == "active":
                if profile.store:
                    queryset = queryset.filter(store=profile.store)
        except Exception:
            pass
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        elif self.action == "create":
            return OrderCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return OrderUpdateSerializer
        return OrderDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate order_no and set created_by"""
        order_no = generate_order_no()
        serializer.save(order_no=order_no, created_by=self.request.user)
        return serializer.data

    # ── 状态流转 ──
    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        """确认订单"""
        order = self.get_object()
        order.status = OrderStatus.CONFIRMED
        order.save(update_fields=["status", "updated_at"])
        OrderChangeLog.objects.create(
            order=order, operator=request.user, change_content="订单已确认"
        )
        return Response({"detail": "已确认"})

    @action(detail=True, methods=["post"], url_path="start-production")
    def start_production(self, request, pk=None):
        """开始生产（标记为已生产）"""
        order = self.get_object()
        if order.status != OrderStatus.CONFIRMED:
            return Response(
                {"detail": f"当前状态为「{order.get_status_display()}」，只有已确认状态才能开始生产"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderStatus.PRODUCED
        order.save(update_fields=["status", "updated_at"])
        OrderChangeLog.objects.create(
            order=order, operator=request.user, change_content="已开始生产"
        )
        return Response({"detail": "已开始生产"})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """取消订单"""
        order = self.get_object()
        order.status = OrderStatus.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        OrderChangeLog.objects.create(
            order=order, operator=request.user, change_content="订单已取消"
        )
        return Response({"detail": "已取消"})

    @action(detail=True, methods=["post"], url_path="mark-arrived")
    def mark_arrived(self, request, pk=None):
        """标记到货"""
        order = self.get_object()
        order.status = OrderStatus.ARRIVED
        order.save(update_fields=["status", "updated_at"])
        OrderChangeLog.objects.create(
            order=order, operator=request.user, change_content="已到货"
        )
        return Response({"detail": "已到货"})

    ROLLBACK_MAP = {
        OrderStatus.CONFIRMED: OrderStatus.PENDING,
        OrderStatus.PRODUCED: OrderStatus.CONFIRMED,
        OrderStatus.SHIPPED: OrderStatus.PRODUCED,
    }

    @action(detail=True, methods=["post"], url_path="rollback")
    def rollback(self, request, pk=None):
        """订单状态回退（撤回确认 / 撤回投产）"""
        order = self.get_object()
        target = self.ROLLBACK_MAP.get(order.status)
        if not target:
            return Response(
                {"detail": f"当前状态「{order.get_status_display()}」不支持回退"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_display = order.get_status_display()
        order.status = target
        order.save(update_fields=["status", "updated_at"])
        # 记录操作日志
        OrderChangeLog.objects.create(
            order=order,
            operator=request.user,
            change_content=f"{old_display} → {order.get_status_display()}（撤回操作）",
        )
        return Response({"detail": f"已回退为「{order.get_status_display()}」"})

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        """批量导入订单（Excel）"""
        serializer = OrderBulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        file = serializer.validated_data["file"]
        wb = openpyxl.load_workbook(file)
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
        created_count = 0
        errors = []
        for idx, row in enumerate(rows, start=2):
            try:
                if not row or not row[0]:
                    continue
                Order.objects.create(
                    order_no=str(row[0]).strip(),
                    source=str(row[1]).strip() if len(row) > 1 else "direct",
                    customer_name=str(row[2]).strip() if len(row) > 2 else "",
                    customer_phone=str(row[3]).strip() if len(row) > 3 else "",
                    customer_address=str(row[4]).strip() if len(row) > 4 else "",
                    province=str(row[5]).strip() if len(row) > 5 else "",
                    city=str(row[6]).strip() if len(row) > 6 else "",
                    district=str(row[7]).strip() if len(row) > 7 else "",
                    product_line=str(row[8]).strip() if len(row) > 8 else "wood",
                )
                created_count += 1
            except Exception as e:
                errors.append({"row": idx, "error": str(e)})
        return Response(
            {"created": created_count, "errors": errors}, status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        """导出订单列表"""
        import io

        from django.http import HttpResponse

        queryset = self.filter_queryset(self.get_queryset())

        # Simple CSV export
        output = io.StringIO()
        output.write("订单号,来源,客户姓名,客户电话,客户地址,省,市,区,产品线,状态,创建时间\n")
        for order in queryset:
            output.write(
                f"{order.order_no},{order.source},{order.customer_name},"
                f"{order.customer_phone},{order.customer_address},"
                f"{order.province},{order.city},{order.district},"
                f"{order.product_line},{order.status},{order.created_at}\n"
            )

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="orders.csv"'
        return response


class OrderItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """订单明细"""
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["order", "product_type"]


class OrderChangeLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """订单修改日志 - 只读"""
    queryset = OrderChangeLog.objects.select_related("operator").all()
    serializer_class = OrderChangeLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["order", "operator"]

    def get_permissions(self):
        # 日志只读
        if self.action in ["create", "update", "partial_update", "destroy"]:
            from rest_framework.permissions import IsAdminUser

            return [IsAdminUser()]
        return []
