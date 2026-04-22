# -*- coding: utf-8 -*-

"""
installations app - 视图
"""

from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order
from apps.orders.serializers import OrderListSerializer
from common.enums import OrderStatus
from common.utils import generate_task_no

from .models import InstallationTask
from .serializers import (
    InstallationTaskCreateSerializer,
    InstallationTaskDetailSerializer,
    InstallationTaskListSerializer,
    InstallationTaskReviewSerializer,
    InstallationTaskUpdateSerializer,
)


class OrderAddressSearchView(generics.ListAPIView):
    """按客户地址模糊查询订单列表"""

    permission_classes = [IsAuthenticated]
    serializer_class = OrderListSerializer

    def get_queryset(self):
        keyword = self.request.query_params.get("keyword", "")
        if not keyword:
            return Order.objects.none()
        return (
            Order.objects.select_related("brand", "store", "branch", "created_by")
            .filter(customer_address__icontains=keyword)
            .only(
                "id",
                "order_no",
                "customer_address",
                "customer_name",
                "customer_phone",
                "brand",
                "store",
                "status",
                "source",
                "product_line",
                "customer_price",
                "cost_price",
                "created_at",
            )
        )


class InstallationTaskViewSet(viewsets.ModelViewSet):
    """安装任务管理"""

    permission_classes = [IsAuthenticated]
    queryset = (
        InstallationTask.objects.select_related(
            "order",
            "brand",
            "store",
            "assigned_by",
            "reviewed_by",
            "branch",
            "parent_task",
        )
        .prefetch_related("installers")
        .all()
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "order",
        "source",
        "brand",
        "store",
        "status",
        "branch",
        "assigned_by",
    ]
    search_fields = ["task_no", "customer_name", "customer_phone", "customer_address"]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return InstallationTaskListSerializer
        elif self.action == "create":
            return InstallationTaskCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return InstallationTaskUpdateSerializer
        return InstallationTaskDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate task_no, set assigned_by, and check independent creation permission."""
        # 检查独立创建权限（没有关联订单时）
        order = serializer.validated_data.get("order")
        if not order:
            if not _check_can_create_independent(self.request.user):
                raise drf_serializers.ValidationError(
                    "无权限创建独立安装任务，请从订单关联创建"
                )

        task_no = generate_task_no("IT")  # IT = Installation Task
        serializer.save(task_no=task_no, assigned_by=self.request.user)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """派单 - 指定安装师傅"""
        task = self.get_object()
        if task.status != "pending":
            return Response(
                {
                    "error": f"当前状态为{task.get_status_display()}，只有待派单才能执行此操作"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        installer_ids = request.data.get("installers")
        if not installer_ids:
            return Response(
                {"error": "请至少选择一个安装师傅"}, status=status.HTTP_400_BAD_REQUEST
            )

        from apps.personnel.models import Worker

        workers = Worker.objects.filter(id__in=installer_ids)
        if workers.count() != len(installer_ids):
            return Response(
                {"error": "部分师傅不存在"}, status=status.HTTP_400_BAD_REQUEST
            )

        task.status = "assigned"
        task.assigned_at = timezone.now()
        task.save(update_fields=["status", "assigned_at", "updated_at"])
        task.installers.set(workers)
        task.refresh_from_db()
        return Response(InstallationTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """完成安装任务"""
        task = self.get_object()
        if task.status != "assigned":
            return Response(
                {
                    "error": f"当前状态为{task.get_status_display()}，只有已派单才能执行此操作"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = "completed"
        task.completed_at = timezone.now()
        notes = request.data.get("notes")
        if notes is not None:
            task.notes = notes
        completion_photos = request.data.get("completion_photos")
        if completion_photos is not None:
            task.room_photos = completion_photos
        task.save()
        task.refresh_from_db()
        return Response(InstallationTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """取消安装任务"""
        task = self.get_object()
        if task.status not in ("pending", "assigned"):
            return Response(
                {
                    "error": f"当前状态为{task.get_status_display()}，只有待派单或已派单才能取消"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = "cancelled"
        task.cancel_reason = request.data.get("reason", "")
        task.save(update_fields=["status", "cancel_reason", "updated_at"])
        task.refresh_from_db()
        return Response(InstallationTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """审核安装任务"""
        task = self.get_object()
        serializer = InstallationTaskReviewSerializer(
            task, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())

        # 部分完成时自动生成新任务
        if task.status == "partial" and task.partial_next_type:
            new_task = InstallationTask.objects.create(
                task_no=_generate_task_no(),
                order=task.order,
                source=task.source,
                brand=task.brand,
                store=task.store,
                branch=task.branch,
                customer_name=task.customer_name,
                customer_phone=task.customer_phone,
                customer_address=task.customer_address,
                parent_task=task,
            )
            # 默认原师傅
            if task.installers.exists():
                new_task.installers.set(task.installers.all())

        return Response(InstallationTaskDetailSerializer(task).data)

    @action(detail=False, methods=["post"], url_path="create-from-order")
    def create_from_order(self, request):
        """从订单生成安装单"""
        order_id = request.data.get("order_id")
        if not order_id:
            return Response(
                {"error": "order_id 必填"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.select_related("brand", "store", "branch").get(
                id=order_id
            )
        except Order.DoesNotExist:
            return Response({"error": "订单不存在"}, status=status.HTTP_404_NOT_FOUND)

        # 检查订单状态：只有 confirmed、produced、shipped 状态才能生成安装单
        allowed_statuses = [
            OrderStatus.CONFIRMED,
            OrderStatus.PRODUCED,
            OrderStatus.SHIPPED,
        ]
        if order.status not in allowed_statuses:
            return Response(
                {
                    "error": f"订单状态为 {order.get_status_display()}，只有已确认和已发货状态才能生成安装单"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 检查是否已存在该订单的安装单（避免重复创建）
        existing = InstallationTask.objects.filter(order=order, source="order").first()
        if existing:
            return Response(
                {
                    "error": f"该订单已生成安装单 {existing.task_no}",
                    "task_id": existing.id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 使用事务确保原子性
        with transaction.atomic():
            # 从订单 items 提取产品信息
            items = order.items.all()
            door_types = []
            door_quantity = 0
            for item in items:
                door_types.append(
                    {
                        "product_name": item.product_name,
                        "product_model": item.product_model,
                        "quantity": item.quantity,
                        "color": item.color,
                    }
                )
                door_quantity += item.quantity

            # 创建安装单
            task_no = generate_task_no("IT")
            installation = InstallationTask.objects.create(
                task_no=task_no,
                order=order,
                source="order",
                brand=order.brand,
                store=order.store,
                branch=order.branch,
                customer_name=order.customer_name,
                customer_phone=order.customer_phone,
                customer_address=order.customer_address,
                door_types=door_types,
                door_quantity=door_quantity,
                assigned_by=request.user,
            )

        return Response(
            InstallationTaskDetailSerializer(installation).data,
            status=status.HTTP_201_CREATED,
        )


def _generate_task_no():
    """生成安装任务编号"""
    from datetime import datetime

    return f'INST{datetime.now().strftime("%Y%m%d%H%M%S")}'


def _check_can_create_independent(user):
    """
    检查用户是否有权限创建独立安装任务（无关联订单）。
    规则：用户 UserProfile.role 的 permissions JSON 包含 'installations.can_create_independent' 则允许。
    """
    # 检查 UserProfile -> Role -> permissions JSON
    try:
        profile = user.profile
        role = profile.role
        if role and isinstance(role.permissions, dict):
            # 检查 key-value 格式
            if role.permissions.get("installations.can_create_independent"):
                return True
            # 检查 permissions 列表格式
            perms = role.permissions.get("permissions", [])
            if (
                isinstance(perms, list)
                and "installations.can_create_independent" in perms
            ):
                return True
            # 检查 permissions dict 格式
            if isinstance(perms, dict) and perms.get(
                "installations.can_create_independent"
            ):
                return True
    except Exception:
        pass

    return False
