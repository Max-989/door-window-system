# -*- coding: utf-8 -*-

"""
maintenance app - 维修管理
按需求文档第十二节重构：责任判定、部分完成
"""

from django.db import models

from common.enums import MaintenanceResponsibility, MaintenanceStatus, OrderSource
from common.validators import phone_validator


class MaintenanceTask(models.Model):
    """维修任务"""

    task_no = models.CharField("任务编号", max_length=50, unique=True, db_index=True)

    # 来源
    source = models.CharField(
        "来源",
        max_length=20,
        choices=OrderSource.CHOICES,
        default=OrderSource.BRAND_STORE,
        db_index=True,
    )
    brand = models.ForeignKey(
        "decoration.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_tasks",
        verbose_name="品牌",
    )
    store = models.ForeignKey(
        "decoration.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_tasks",
        verbose_name="门店",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_tasks",
        verbose_name="分公司",
    )

    # 关联原订单
    original_order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_tasks",
        verbose_name="关联原订单",
    )

    # 关联安装单与安装人
    installation_task = models.ForeignKey(
        "installations.InstallationTask",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="关联安装单",
        related_name="maintenance_tasks",
    )
    installer = models.ForeignKey(
        "personnel.Worker",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="安装人",
        related_name="maintenance_installer_tasks",
    )

    # 客户信息
    customer_name = models.CharField("客户姓名", max_length=50, blank=True, default="")
    customer_phone = models.CharField(
        "客户电话", max_length=20, blank=True, default="", validators=[phone_validator]
    )
    customer_address = models.CharField("客户地址", max_length=500, blank=True, default="")

    # 维修信息
    issue_description = models.TextField("问题描述", blank=True, default="")
    site_photos = models.JSONField("现场照片/视频", default=list, blank=True)
    issue_type = models.CharField("问题类型", max_length=50, blank=True, default="")

    # 派单
    assigned_to = models.ForeignKey(
        "personnel.Worker",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_tasks",
        verbose_name="维修师傅",
    )
    assigned_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_maintenance",
        verbose_name="派单人",
    )
    assigned_at = models.DateTimeField("派单时间", null=True, blank=True)

    # 状态
    status = models.CharField(
        "状态",
        max_length=20,
        choices=MaintenanceStatus.CHOICES,
        default=MaintenanceStatus.PENDING,
        db_index=True,
    )
    cancel_reason = models.TextField("取消原因", blank=True, default="")

    # 审核 - 责任判定
    responsibility = models.CharField(
        "责任判定",
        max_length=20,
        choices=MaintenanceResponsibility.CHOICES,
        blank=True,
        default="",
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_maintenance",
        verbose_name="审核人",
    )
    reviewed_at = models.DateTimeField("审核时间", null=True, blank=True)

    # 责任扣费相关
    deduction_worker = models.ForeignKey(
        "personnel.Worker",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="maintenance_deductions",
        verbose_name="扣费师傅",
    )
    deduction_amount = models.DecimalField(
        "扣费金额", max_digits=10, decimal_places=2, default=0
    )

    # 维修费用
    maintenance_fee = models.DecimalField(
        "维修费用", max_digits=10, decimal_places=2, default=0
    )
    wage_amount = models.DecimalField(
        "维修工费", max_digits=10, decimal_places=2, default=0
    )

    # 师傅提交
    completion_photos = models.JSONField("完成照片", default=list, blank=True)
    resolution = models.TextField("解决方案", blank=True, default="")

    # 补发配件
    accessory_reissue = models.BooleanField(default=False, verbose_name="是否补发配件")
    accessory_reissue_reason = models.TextField("补发原因", blank=True, default="")
    reissue_items = models.JSONField(default=list, blank=True, verbose_name="补发配件明细")
    repair_details = models.JSONField(default=list, blank=True, verbose_name="维修详情")

    # 部分完成
    parent_task = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_tasks",
        verbose_name="原任务",
    )

    completed_at = models.DateTimeField("完成时间", null=True, blank=True)
    notes = models.TextField("备注", blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "maintenance_tasks"
        verbose_name = "维修任务"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.task_no
