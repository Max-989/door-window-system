# -*- coding: utf-8 -*-

"""
maintenance app - 视图
"""

from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.installations.models import InstallationTask
from apps.orders.models import Order
from common.utils import generate_task_no

from .models import MaintenanceTask
from .serializers import (
    CreateFromInstallationSerializer,
    CreateFromOrderSerializer,
    MaintenanceTaskCreateSerializer,
    MaintenanceTaskDetailSerializer,
    MaintenanceTaskListSerializer,
    MaintenanceTaskReviewSerializer,
    MaintenanceTaskUpdateSerializer,
)


class MaintenanceTaskViewSet(viewsets.ModelViewSet):
    """维修任务管理"""

    permission_classes = [IsAuthenticated]
    queryset = MaintenanceTask.objects.select_related(
        "original_order",
        "brand",
        "store",
        "assigned_to",
        "assigned_by",
        "reviewed_by",
        "deduction_worker",
        "branch",
        "parent_task",
        "installation_task",
        "installer",
    ).all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        "source",
        "brand",
        "store",
        "original_order",
        "assigned_to",
        "status",
        "responsibility",
        "branch",
        "installation_task",
        "installer",
    ]
    search_fields = ["task_no", "customer_name", "customer_phone", "issue_description"]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return MaintenanceTaskListSerializer
        elif self.action == "create":
            return MaintenanceTaskCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return MaintenanceTaskUpdateSerializer
        return MaintenanceTaskDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate task_no, set assigned_by, check independent creation permission."""
        installation_task = serializer.validated_data.get("installation_task")
        original_order = serializer.validated_data.get("original_order")

        # 权限检查：无 installation_task 且无 original_order 时，需要有独立创建权限
        if not installation_task and not original_order:
            if not _check_can_create_independent(self.request.user):
                from rest_framework import serializers as drf_serializers

                raise drf_serializers.ValidationError(
                    "无权限创建独立售后单，请从订单或安装单关联创建"
                )

        task_no = generate_task_no("MT")  # MT = Maintenance Task
        warning = serializer.context.pop("installation_warning", None)
        instance = serializer.save(task_no=task_no, assigned_by=self.request.user)

        # 将警告信息附加到响应（通过 notes 或 headers）——简单实现暂不处理
        return instance

    def create(self, request, *args, **kwargs):
        """重写 create 以支持警告信息返回"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        # 附加警告信息
        warning = serializer.context.get("installation_warning")
        if warning:
            data["warning"] = warning
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """派单 - 指定维修师傅"""
        task = self.get_object()
        if task.status != "pending":
            return Response(
                {
                    "error": f"当前状态为{task.get_status_display()}，只有待派单才能执行此操作"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        installer_id = request.data.get("installer")
        if not installer_id:
            return Response(
                {"error": "请指定维修师傅"}, status=status.HTTP_400_BAD_REQUEST
            )

        from apps.personnel.models import Worker

        try:
            worker = Worker.objects.get(id=installer_id)
        except Worker.DoesNotExist:
            return Response({"error": "师傅不存在"}, status=status.HTTP_400_BAD_REQUEST)

        task.assigned_to = worker
        task.status = "assigned"
        task.assigned_at = timezone.now()
        task.save(update_fields=["assigned_to", "status", "assigned_at", "updated_at"])
        task.refresh_from_db()
        return Response(MaintenanceTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """完成维修任务"""
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
        photos = request.data.get("photos")
        if photos is not None:
            task.completion_photos = photos
        task.save()
        task.refresh_from_db()
        return Response(MaintenanceTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """取消维修任务"""
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
        return Response(MaintenanceTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """审核维修任务 - 含责任判定"""
        task = self.get_object()
        serializer = MaintenanceTaskReviewSerializer(
            task, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())

        # 责任扣费：安装/量尺/送货责任自动扣对应师傅工费
        if (
            task.responsibility in ["installation", "measurement", "delivery"]
            and task.deduction_amount > 0
        ):
            # 扣费逻辑在实际业务中实现
            pass

        return Response(MaintenanceTaskDetailSerializer(task).data)

    @action(detail=False, methods=["post"], url_path="create-from-order")
    def create_from_order(self, request):
        """从订单创建售后单"""
        serializer = CreateFromOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data["order_id"]
        installation_task_id = serializer.validated_data.get("installation_task_id")
        issue_description = serializer.validated_data["issue_description"]

        try:
            order = Order.objects.select_related("brand", "store", "branch").get(
                id=order_id
            )
        except Order.DoesNotExist:
            return Response({"error": "订单不存在"}, status=status.HTTP_404_NOT_FOUND)

        # 🔴 重复检查：同一订单是否已有 source='order' 的售后单
        existing = MaintenanceTask.objects.filter(
            original_order=order, source="order"
        ).first()
        if existing:
            return Response(
                {
                    "error": f"该订单已存在售后单 {existing.task_no}",
                    "task_id": existing.id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 解析安装单（可选）
        installation_task = None
        installer = None
        if installation_task_id:
            try:
                installation_task = InstallationTask.objects.get(
                    id=installation_task_id, order=order
                )
                # 自动带出安装人
                first_installer = installation_task.installers.first()
                if first_installer:
                    installer = first_installer
            except InstallationTask.DoesNotExist:
                return Response(
                    {"error": "安装单不存在或不属于该订单"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            task_no = generate_task_no("MT")
            maintenance = MaintenanceTask.objects.create(
                task_no=task_no,
                source="order",
                brand=order.brand,
                store=order.store,
                branch=order.branch,
                original_order=order,
                installation_task=installation_task,
                installer=installer,
                customer_name=order.customer_name,
                customer_phone=order.customer_phone,
                customer_address=order.customer_address,
                issue_description=issue_description,
                site_photos=serializer.validated_data.get("site_photos", []),
                issue_type=serializer.validated_data.get("issue_type", ""),
                notes=serializer.validated_data.get("notes", ""),
                assigned_by=request.user,
            )

        return Response(
            MaintenanceTaskDetailSerializer(maintenance).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="create-from-installation")
    def create_from_installation(self, request):
        """从安装单创建售后单（自动带出安装人）"""
        serializer = CreateFromInstallationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        installation_task_id = serializer.validated_data["installation_task_id"]
        issue_description = serializer.validated_data["issue_description"]

        try:
            installation_task = InstallationTask.objects.select_related(
                "order", "brand", "store", "branch"
            ).get(id=installation_task_id)
        except InstallationTask.DoesNotExist:
            return Response({"error": "安装单不存在"}, status=status.HTTP_404_NOT_FOUND)

        # 🔴 重复检查：同一安装单是否已有 source='installation' 的售后单
        existing = MaintenanceTask.objects.filter(
            installation_task=installation_task, source="installation"
        ).first()
        if existing:
            return Response(
                {
                    "error": f"该安装单已存在售后单 {existing.task_no}",
                    "task_id": existing.id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🟡 状态检查：只有 assigned 或 completed 状态的安装单才能创建售后单
        if installation_task.status not in ["assigned", "completed"]:
            return Response(
                {
                    "error": f"安装单状态为 {installation_task.get_status_display()}，只有已派单或已完成状态才能创建售后单"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 自动带出安装人
        installer = installation_task.installers.first()

        with transaction.atomic():
            task_no = generate_task_no("MT")
            maintenance = MaintenanceTask.objects.create(
                task_no=task_no,
                source="installation",
                brand=installation_task.brand,
                store=installation_task.store,
                branch=installation_task.branch,
                original_order=installation_task.order,
                installation_task=installation_task,
                installer=installer,
                customer_name=installation_task.customer_name,
                customer_phone=installation_task.customer_phone,
                customer_address=installation_task.customer_address,
                issue_description=issue_description,
                site_photos=serializer.validated_data.get("site_photos", []),
                issue_type=serializer.validated_data.get("issue_type", ""),
                notes=serializer.validated_data.get("notes", ""),
                assigned_by=request.user,
            )

        result = MaintenanceTaskDetailSerializer(maintenance).data
        if installer:
            result["message"] = f"已自动带出安装人：{installer.name}"
        return Response(result, status=status.HTTP_201_CREATED)


def _check_can_create_independent(user):
    """
    检查用户是否有权限创建独立售后任务（无关联订单/安装单）。
    规则：用户 UserProfile.role 的 permissions JSON 包含 'maintenance.can_create_independent' 则允许。
    """
    try:
        profile = user.profile
    except Exception:
        # 无 profile 视为超级管理员
        return True

    role = profile.role
    # 如果 role 为 None，视为超级管理员，直接允许
    if role is None:
        return True

    if role and isinstance(role.permissions, dict):
        # 检查 key-value 格式
        if role.permissions.get("maintenance.can_create_independent"):
            return True
        # 检查 permissions 列表格式
        perms = role.permissions.get("permissions", [])
        if isinstance(perms, list) and "maintenance.can_create_independent" in perms:
            return True
        # 检查 permissions dict 格式
        if isinstance(perms, dict) and perms.get("maintenance.can_create_independent"):
            return True

    return False
