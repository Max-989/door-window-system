# -*- coding: utf-8 -*-

"""
通用工具函数
"""
import uuid


def generate_order_no():
    """生成订单编号 CP-XXXXXXXX"""
    import datetime

    today = datetime.date.today().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:6].upper()
    return f"CP-{today}{unique}"


def generate_request_no(prefix="MR"):
    """生成请求编号"""
    import datetime

    today = datetime.date.today().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{today}{unique}"


def generate_task_no(prefix="IT"):
    """生成任务编号"""
    import datetime

    today = datetime.date.today().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{today}{unique}"


class JSONField:
    """Simple JSON field descriptor for SQLite compatibility.
    In production MySQL, use django.db.models.JSONField directly.
    """

    pass
