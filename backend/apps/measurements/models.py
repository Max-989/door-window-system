# -*- coding: utf-8 -*-

"""
measurements app - 量尺管理
按需求文档第十节重构：4个状态
"""
from django.db import models

from common.enums import MeasurementStatus
from common.validators import phone_validator


class MeasurementTask(models.Model):
    """量尺任务"""

    task_no = models.CharField("任务编号", max_length=50, unique=True, db_index=True)

    # 来源信息
    source = models.CharField(
        "来源", max_length=20, default="direct", help_text="brand_store/direct", db_index=True
    )
    brand = models.ForeignKey(
        "decoration.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="measurement_tasks",
        verbose_name="品牌",
    )
    store = models.ForeignKey(
        "decoration.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="measurement_tasks",
        verbose_name="门店",
    )
    requested_by = models.ForeignKey(
        "decoration.DecorationStaff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="measurement_requests",
        verbose_name="申请人",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="measurement_tasks",
        verbose_name="分公司",
    )

    # 客户信息
    customer_name = models.CharField("客户姓名", max_length=50, blank=True, default="")
    customer_phone = models.CharField(
        "客户电话", max_length=20, blank=True, default="", validators=[phone_validator]
    )
    customer_address = models.CharField("客户地址", max_length=500)

    # 产品明细
    product_details = models.JSONField(
        "产品明细", default=list, blank=True, help_text="按房间添加的产品信息"
    )

    # 派单
    assigned_to = models.ForeignKey(
        "personnel.Worker",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="measurement_tasks",
        verbose_name="量尺师傅",
    )
    assigned_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_measurements",
        verbose_name="派单人",
    )
    assigned_at = models.DateTimeField("派单时间", null=True, blank=True)

    # 状态
    status = models.CharField(
        "状态",
        max_length=20,
        choices=MeasurementStatus.CHOICES,
        default=MeasurementStatus.PENDING,
        db_index=True,
    )
    cancel_reason = models.TextField("取消原因", blank=True, default="")

    # 师傅提交
    site_photos = models.JSONField("现场照片", default=list, blank=True)
    measurement_data = models.JSONField("测量数据", default=dict, blank=True)
    completed_at = models.DateTimeField("完成时间", null=True, blank=True)
    notes = models.TextField("备注", blank=True, default="")

    # 工费
    wage_amount = models.DecimalField("工费", max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "measurement_tasks"
        verbose_name = "量尺任务"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.task_no
