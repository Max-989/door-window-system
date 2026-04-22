# -*- coding: utf-8 -*-

"""
installations app - 安装管理
按需求文档第十一节重构：部分完成、增项费用、多师傅支持
"""

from django.db import models

from common.enums import InstallationStatus, OrderSource
from common.validators import phone_validator


class InstallationTask(models.Model):
    """安装任务"""

    task_no = models.CharField("任务编号", max_length=50, unique=True, db_index=True)

    # 关联订单
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_tasks",
        verbose_name="关联订单",
    )

    # 来源信息
    source = models.CharField(
        "来源",
        max_length=20,
        choices=OrderSource.CHOICES,
        default=OrderSource.BRAND_STORE,
        help_text="订单自动生成/手动创建/直接安装",
        db_index=True,
    )
    brand = models.ForeignKey(
        "decoration.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_tasks",
        verbose_name="品牌",
    )
    store = models.ForeignKey(
        "decoration.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_tasks",
        verbose_name="门店",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="installation_tasks",
        verbose_name="分公司",
    )

    # 客户信息（直接安装单用）
    customer_name = models.CharField("客户姓名", max_length=50, blank=True, default="")
    customer_phone = models.CharField(
        "客户电话", max_length=20, blank=True, default="", validators=[phone_validator]
    )
    customer_address = models.CharField(
        "客户地址", max_length=500, blank=True, default=""
    )

    # 直接安装单信息
    door_types = models.JSONField(
        "门种类", default=list, blank=True, help_text="直接安装单填写"
    )
    door_quantity = models.IntegerField("门数量", default=0)
    size_list = models.JSONField("尺寸单", default=list, blank=True)

    # 派单 - 多师傅支持
    installers = models.ManyToManyField(
        "personnel.Worker",
        blank=True,
        related_name="installation_tasks",
        verbose_name="安装师傅",
    )
    assigned_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_installations",
        verbose_name="派单人",
    )
    assigned_at = models.DateTimeField("派单时间", null=True, blank=True)

    # 状态
    status = models.CharField(
        "状态",
        max_length=20,
        choices=InstallationStatus.CHOICES,
        default=InstallationStatus.PENDING,
        db_index=True,
    )
    cancel_reason = models.TextField("取消原因", blank=True, default="")

    # 师傅提交
    room_photos = models.JSONField("按房间安装照片", default=list, blank=True)
    installed_quantity = models.IntegerField(
        "安装数量", default=0, help_text="自动生成可改"
    )
    additional_items = models.TextField("增项说明", blank=True, default="")
    additional_fee = models.DecimalField(
        "增项费用",
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="文员/后台填写",
    )
    subsidy = models.DecimalField(
        "补贴",
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="安装确认时填入，默认0",
    )
    notes = models.TextField("备注", blank=True, default="")

    # 审核
    reviewed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_installations",
        verbose_name="审核人",
    )
    reviewed_at = models.DateTimeField("审核时间", null=True, blank=True)

    # 部分完成时生成新任务的类型
    partial_next_type = models.CharField(
        "部分完成后任务类型",
        max_length=20,
        blank=True,
        default="",
        help_text="售后/安装",
    )
    parent_task = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_tasks",
        verbose_name="原任务",
    )

    completed_at = models.DateTimeField("完成时间", null=True, blank=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "installation_tasks"
        verbose_name = "安装任务"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.task_no
