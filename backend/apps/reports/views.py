"""
reports app - 数据看板
按需求文档第十七节：利润统计、师傅绩效、维修统计
"""
from datetime import timedelta

from django.db.models import Count, DecimalField, F, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.installations.models import InstallationTask
from apps.maintenance.models import MaintenanceTask
from apps.measurements.models import MeasurementTask
from apps.orders.models import Order
from apps.personnel.models import WageSettlement, Worker


class ReportsRootView(APIView):
    """数据看板根路由"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "endpoints": {
                    "profit": request.build_absolute_uri("profit/"),
                    "orders": request.build_absolute_uri("orders/"),
                    "worker_performance": request.build_absolute_uri(
                        "worker-performance/"
                    ),
                    "maintenance": request.build_absolute_uri("maintenance/"),
                    "inventory": request.build_absolute_uri("inventory/"),
                }
            }
        )


class ProfitStatisticsView(APIView):
    """乙方利润统计"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """公式：订单收入 - 货品价格 - 承包费用/工费 - 其他支出"""
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        queryset = Order.objects.filter(status="completed")
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        stats = queryset.aggregate(
            total_orders=Count("id"),
            total_revenue=Coalesce(
                Sum("customer_price"), 0, output_field=DecimalField()
            ),
            total_cost=Coalesce(Sum("cost_price"), 0, output_field=DecimalField()),
            total_profit=Coalesce(
                Sum(F("customer_price") - F("cost_price")),
                0,
                output_field=DecimalField(),
            ),
        )

        # 按品牌分组统计
        by_brand = (
            queryset.values("brand__name")
            .annotate(
                order_count=Count("id"),
                revenue=Coalesce(Sum("customer_price"), 0, output_field=DecimalField()),
                cost=Coalesce(Sum("cost_price"), 0, output_field=DecimalField()),
            )
            .order_by("-revenue")
        )

        # 按产品线分组统计
        by_product_line = (
            queryset.values("product_line")
            .annotate(
                order_count=Count("id"),
                revenue=Coalesce(Sum("customer_price"), 0, output_field=DecimalField()),
            )
            .order_by("-revenue")
        )

        return Response(
            {
                "summary": stats,
                "by_brand": list(by_brand),
                "by_product_line": list(by_product_line),
            }
        )


class OrderStatisticsView(APIView):
    """订单统计"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        queryset = Order.objects.all()
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        stats = queryset.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status="completed")),
            cancelled=Count("id", filter=Q(status="cancelled")),
            total_amount=Coalesce(
                Sum("customer_price"), 0, output_field=DecimalField()
            ),
        )
        stats["completion_rate"] = (
            round(stats["completed"] / stats["total"] * 100, 1)
            if stats["total"] > 0
            else 0
        )

        # 按状态分布
        by_status = (
            queryset.values("status").annotate(count=Count("id")).order_by("-count")
        )

        # 按来源分布
        by_source = (
            queryset.values("source").annotate(count=Count("id")).order_by("-count")
        )

        return Response(
            {
                "summary": stats,
                "by_status": list(by_status),
                "by_source": list(by_source),
            }
        )


class WorkerPerformanceView(APIView):
    """师傅绩效统计"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        skill_type = request.query_params.get("skill_type")

        queryset = Worker.objects.filter(status="active")

        results = []
        for worker in queryset:
            # 安装完成量
            install_qs = InstallationTask.objects.filter(
                installers=worker, status="completed"
            )
            if start_date:
                install_qs = install_qs.filter(created_at__date__gte=start_date)
            if end_date:
                install_qs = install_qs.filter(created_at__date__lte=end_date)
            install_count = install_qs.count()
            install_quantity = install_qs.aggregate(
                total=Coalesce(Sum("installed_quantity"), 0)
            )["total"]

            # 量尺完成量
            measure_qs = MeasurementTask.objects.filter(
                assigned_to=worker, status="completed"
            )
            if start_date:
                measure_qs = measure_qs.filter(created_at__date__gte=start_date)
            if end_date:
                measure_qs = measure_qs.filter(created_at__date__lte=end_date)
            measure_count = measure_qs.count()

            # 维修完成量
            maintain_qs = MaintenanceTask.objects.filter(
                assigned_to=worker, status="completed"
            )
            if start_date:
                maintain_qs = maintain_qs.filter(created_at__date__gte=start_date)
            if end_date:
                maintain_qs = maintain_qs.filter(created_at__date__lte=end_date)
            maintain_count = maintain_qs.count()

            # 月结算工费
            settlements = WageSettlement.objects.filter(worker=worker, status="paid")
            total_wage = settlements.aggregate(
                total=Coalesce(Sum("total_fee"), 0, output_field=DecimalField())
            )["total"]

            results.append(
                {
                    "worker_id": worker.id,
                    "worker_name": worker.name,
                    "phone": worker.phone,
                    "skills": worker.skills,
                    "installation_count": install_count,
                    "installation_quantity": install_quantity,
                    "measurement_count": measure_count,
                    "maintenance_count": maintain_count,
                    "total_wage": str(total_wage),
                }
            )

        return Response(results)


class MaintenanceStatisticsView(APIView):
    """维修统计"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        queryset = MaintenanceTask.objects.all()
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)

        stats = queryset.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status="completed")),
            total_fee=Coalesce(Sum("maintenance_fee"), 0, output_field=DecimalField()),
            total_wage=Coalesce(Sum("wage_amount"), 0, output_field=DecimalField()),
            total_deduction=Coalesce(
                Sum("deduction_amount"), 0, output_field=DecimalField()
            ),
        )

        # 责任分布
        by_responsibility = (
            queryset.exclude(responsibility="")
            .values("responsibility")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response(
            {
                "summary": stats,
                "by_responsibility": list(by_responsibility),
            }
        )


class InventoryStatisticsView(APIView):
    """库存统计"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.warehouse.models import (
            HardwareInventory,
            PendingGoods,
            WarehouseProduct,
        )

        # 已确认未到货
        not_arrived = WarehouseProduct.objects.filter(
            status__in=["pending_ship", "shipped"]
        ).count()

        # 未派送
        not_delivered = WarehouseProduct.objects.filter(
            status__in=["arrived", "pending_deliver"]
        ).count()

        # 五金预警
        hardware_alert = HardwareInventory.objects.filter(
            available_stock__lte=F("alert_quantity")
        ).count()

        # 货品暂存未匹配
        pending_unmatched = PendingGoods.objects.filter(
            match_status="unmatched"
        ).count()

        return Response(
            {
                "not_arrived": not_arrived,
                "not_delivered": not_delivered,
                "hardware_alert": hardware_alert,
                "pending_unmatched": pending_unmatched,
            }
        )
