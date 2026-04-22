# -*- coding: utf-8 -*-

"""
健康检查端点
用于Docker健康检查和系统监控
"""

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    """
    健康检查端点
    返回系统各组件状态
    """
    status = {"status": "healthy", "timestamp": None, "components": {}}

    try:
        from django.utils.timezone import now

        status["timestamp"] = now().isoformat()
    except Exception:
        import datetime

        status["timestamp"] = datetime.datetime.now().isoformat()

    # 1. 数据库检查
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        status["components"]["database"] = {
            "status": "healthy",
            "type": connection.vendor,
        }
    except Exception as e:
        status["components"]["database"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "unhealthy"

    # 2. Redis检查
    try:
        # 尝试从Django缓存访问Redis
        cache_key = "health_check"
        cache.set(cache_key, "test", 5)
        cached_value = cache.get(cache_key)

        if cached_value == "test":
            status["components"]["redis"] = {"status": "healthy"}
        else:
            status["components"]["redis"] = {
                "status": "unhealthy",
                "error": "缓存读写失败",
            }
            status["status"] = "unhealthy"
    except Exception as e:
        status["components"]["redis"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "unhealthy"

    # 3. 磁盘空间检查（可选）
    try:
        import shutil

        disk_usage = shutil.disk_usage("/")
        status["components"]["disk"] = {
            "status": "healthy",
            "total_gb": round(disk_usage.total / (1024**3), 2),
            "used_gb": round(disk_usage.used / (1024**3), 2),
            "free_gb": round(disk_usage.free / (1024**3), 2),
            "free_percent": round(disk_usage.free / disk_usage.total * 100, 2),
        }

        # 如果磁盘空间不足10%，标记为不健康
        if disk_usage.free / disk_usage.total < 0.1:
            status["components"]["disk"]["status"] = "warning"
            if status["status"] == "healthy":
                status["status"] = "degraded"
    except Exception as e:
        status["components"]["disk"] = {"status": "unknown", "error": str(e)}

    # 4. 内存检查（可选）- 仅当psutil可用时
    try:
        import psutil

        memory = psutil.virtual_memory()
        status["components"]["memory"] = {
            "status": "healthy",
            "total_gb": round(memory.total / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "used_percent": round(memory.percent, 2),
        }

        # 如果内存使用超过90%，标记为警告
        if memory.percent > 90:
            status["components"]["memory"]["status"] = "warning"
            if status["status"] == "healthy":
                status["status"] = "degraded"
    except ImportError:
        # psutil未安装，跳过内存检查
        status["components"]["memory"] = {
            "status": "disabled",
            "message": "psutil not installed",
        }
    except Exception as e:
        status["components"]["memory"] = {"status": "unknown", "error": str(e)}

    # 根据状态返回相应的HTTP状态码
    if status["status"] == "healthy":
        return JsonResponse(status, status=200)
    elif status["status"] == "degraded":
        return JsonResponse(status, status=206)  # 部分内容
    else:
        return JsonResponse(status, status=503)  # 服务不可用


@require_GET
def ping(request):
    """
    简单ping端点，用于负载均衡健康检查
    """
    return JsonResponse({"status": "ok", "message": "pong"})
