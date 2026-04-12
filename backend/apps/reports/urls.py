"""
reports app - URL配置
"""
from django.urls import path

from . import views

urlpatterns = [
    path("", views.ReportsRootView.as_view(), name="reports-root"),
    path("profit/", views.ProfitStatisticsView.as_view(), name="profit-statistics"),
    path("orders/", views.OrderStatisticsView.as_view(), name="order-statistics"),
    path(
        "worker-performance/",
        views.WorkerPerformanceView.as_view(),
        name="worker-performance",
    ),
    path(
        "maintenance/",
        views.MaintenanceStatisticsView.as_view(),
        name="maintenance-statistics",
    ),
    path(
        "inventory/",
        views.InventoryStatisticsView.as_view(),
        name="inventory-statistics",
    ),
]
