# -*- coding: utf-8 -*-

"""
全局异常处理
"""
from datetime import datetime, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if response is not None:
        custom_data = {
            "code": response.status_code,
            "message": _get_error_message(exc),
            "timestamp": timestamp,
        }
        # Include field-level errors
        if isinstance(response.data, dict) and "detail" not in response.data:
            errors = []
            for field, messages in response.data.items():
                if isinstance(messages, list):
                    for msg in messages:
                        errors.append({"field": field, "message": str(msg)})
                else:
                    errors.append({"field": field, "message": str(messages)})
            if errors:
                custom_data["errors"] = errors
        elif isinstance(response.data, dict) and "detail" in response.data:
            custom_data["message"] = response.data["detail"]

        response.data = custom_data
    else:
        response = Response(
            {
                "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "message": "服务器内部错误，请稍后重试",
                "timestamp": timestamp,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _get_error_message(exc):
    if hasattr(exc, "detail"):
        if isinstance(exc.detail, str):
            return exc.detail
        elif isinstance(exc.detail, dict):
            return "参数验证失败"
        elif isinstance(exc.detail, list):
            return "参数验证失败"
    if hasattr(exc, "default_detail"):
        return exc.default_detail
    if hasattr(exc, "message"):
        return exc.message
    return str(exc)
