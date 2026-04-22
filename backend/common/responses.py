# -*- coding: utf-8 -*-

"""
统一响应格式
"""
from datetime import datetime, timezone

from rest_framework.response import Response


def success(data=None, message="操作成功", code=200):
    """成功响应"""
    return Response(
        {
            "code": code,
            "message": message,
            "data": data,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        status=code,
    )


def created(data=None, message="创建成功", code=201):
    """创建成功响应"""
    return Response(
        {
            "code": code,
            "message": message,
            "data": data,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        status=code,
    )


def error(message="操作失败", code=400, errors=None):
    """错误响应"""
    resp_data = {
        "code": code,
        "message": message,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    if errors is not None:
        resp_data["errors"] = errors
    return Response(resp_data, status=code)
