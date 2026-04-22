# -*- coding: utf-8 -*-

"""
measurements app - 视图
"""

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import OrderItem
from apps.orders.serializers import OrderItemSerializer
from common.utils import generate_task_no

from .models import MeasurementTask
from .serializers import (
    MeasurementTaskCreateSerializer,
    MeasurementTaskDetailSerializer,
    MeasurementTaskListSerializer,
    MeasurementTaskUpdateSerializer,
)


class OrderProductsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    """根据订单号获取订单产品明细"""
    serializer_class = OrderItemSerializer

    def get_queryset(self):
        order_no = self.request.query_params.get("order_no", "")
        if not order_no:
            return OrderItem.objects.none()
        return OrderItem.objects.filter(order__order_no=order_no)


class MeasurementTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    """量尺任务管理"""
    queryset = MeasurementTask.objects.select_related(
        "brand", "store", "assigned_to", "assigned_by", "branch", "requested_by"
    ).all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["source", "brand", "store", "assigned_to", "status", "branch"]
    search_fields = ["task_no", "customer_name", "customer_phone", "customer_address"]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return MeasurementTaskListSerializer
        elif self.action == "create":
            return MeasurementTaskCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return MeasurementTaskUpdateSerializer
        return MeasurementTaskDetailSerializer

    def perform_create(self, serializer):
        """Auto-generate task_no and set assigned_by"""
        task_no = generate_task_no("MS")  # MS = Measurement
        serializer.save(task_no=task_no, assigned_by=self.request.user)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """派单 - 指定量尺师傅"""
        task = self.get_object()
        if task.status != "pending":
            return Response(
                {"error": f"当前状态为{task.get_status_display()}，只有待派单才能执行此操作"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        worker_id = request.data.get("worker")
        if not worker_id:
            return Response({"error": "请指定量尺师傅"}, status=status.HTTP_400_BAD_REQUEST)

        from apps.personnel.models import Worker

        try:
            worker = Worker.objects.get(id=worker_id)
        except Worker.DoesNotExist:
            return Response({"error": "师傅不存在"}, status=status.HTTP_400_BAD_REQUEST)

        task.assigned_to = worker
        task.status = "assigned"
        task.assigned_at = timezone.now()
        task.save(update_fields=["assigned_to", "status", "assigned_at", "updated_at"])
        task.refresh_from_db()
        return Response(MeasurementTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """完成量尺任务"""
        task = self.get_object()
        if task.status != "assigned":
            return Response(
                {"error": f"当前状态为{task.get_status_display()}，只有已派单才能执行此操作"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = "completed"
        task.completed_at = timezone.now()
        notes = request.data.get("notes")
        if notes is not None:
            task.notes = notes
        photos = request.data.get("photos")
        if photos is not None:
            task.site_photos = photos
        measurement_data = request.data.get("measurement_data")
        if measurement_data is not None:
            task.measurement_data = measurement_data
        task.save()
        task.refresh_from_db()
        return Response(MeasurementTaskDetailSerializer(task).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """取消量尺任务"""
        task = self.get_object()
        if task.status not in ("pending", "assigned"):
            return Response(
                {"error": f"当前状态为{task.get_status_display()}，只有待派单或已派单才能取消"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = "cancelled"
        task.cancel_reason = request.data.get("reason", "")
        task.save(update_fields=["status", "cancel_reason", "updated_at"])
        task.refresh_from_db()
        return Response(MeasurementTaskDetailSerializer(task).data)
