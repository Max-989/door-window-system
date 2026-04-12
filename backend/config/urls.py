"""
Door & Window Installation Management System - Root URL Configuration
重构后的路由配置
"""
import os
import sys
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

# 添加项目根目录到Python路径，确保common模块可以导入
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from common.health import health_check, ping
except ImportError as e:
    # 如果导入失败，提供更详细的错误信息
    raise ImportError(
        f"无法导入common.health模块。请确保common目录在Python路径中。"
        f"当前sys.path: {sys.path}\n"
        f"backend目录: {backend_dir}\n"
        f"原始错误: {e}"
    )

# Swagger/OpenAPI 配置
schema_view = get_schema_view(
    openapi.Info(
        title="门窗安装管理系统 API",
        default_version="v1",
        description="门窗安装管理系统 REST API 文档",
        terms_of_service="https://www.example.com/terms/",
        contact=openapi.Contact(email="contact@example.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # API 文档
    path(
        "api/docs/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path(
        "api/redoc/",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc",
    ),
    # 健康检查
    path("api/health/", health_check, name="health-check"),
    path("api/ping/", ping, name="ping"),
    # 用户管理
    path("api/v1/users/", include("apps.users.urls")),
    # 装企管理
    path("api/v1/decoration/", include("apps.decoration.urls")),
    # 产品库
    path("api/v1/products/", include("apps.products.urls")),
    # 仓库管理
    path("api/v1/warehouse/", include("apps.warehouse.urls")),
    # 订单管理（路由在 apps.orders.urls 中配置）
    path("api/v1/", include("apps.orders.urls")),
    # 量尺管理
    path("api/v1/measurements/", include("apps.measurements.urls")),
    # 安装管理
    path("api/v1/installations/", include("apps.installations.urls")),
    # 维修管理
    path("api/v1/maintenance/", include("apps.maintenance.urls")),
    # 人员管理（师傅/工头/工费）
    path("api/v1/personnel/", include("apps.personnel.urls")),
    # 通知
    path("api/v1/notifications/", include("apps.notifications.urls")),
    # 数据看板
    path("api/v1/reports/", include("apps.reports.urls")),
    # 权限管理
    path("api/permissions/", include("apps.permissions.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
