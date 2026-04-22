# -*- coding: utf-8 -*-

"""
personnel app - 人员管理（师傅/工头/工费）
按需求文档第十三节新增
"""
from django.db import models

from common.enums import ContractMode, WageBillingType, WorkerSkillType
from common.validators import phone_validator


class Worker(models.Model):
    """服务师傅"""

    name = models.CharField("姓名", max_length=50)
    phone = models.CharField(
        "手机号", max_length=20, unique=True, validators=[phone_validator]
    )
    wechat = models.CharField("微信号", max_length=100, blank=True, default="")
    bank_card_no = models.CharField("银行卡号", max_length=30, blank=True, default="")
    skills = models.JSONField("技能类型", default=list, help_text="量尺/安装/维修/送货多选")
    foreman = models.ForeignKey(
        "Foreman",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers",
        verbose_name="工头归属",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers",
        verbose_name="分公司",
    )
    city = models.CharField("城市", max_length=50, blank=True, default="")
    wage_standard = models.ForeignKey(
        "WageStandard",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workers",
        verbose_name="工费标准",
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=[
            ("active", "在职"),
            ("resigned", "离职"),
            ("disabled", "禁用"),
        ],
        default="active",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="worker_profile",
        verbose_name="关联系统用户",
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "workers"
        verbose_name = "服务师傅"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Foreman(models.Model):
    """工头"""

    name = models.CharField("姓名", max_length=50)
    phone = models.CharField(
        "手机号", max_length=20, unique=True, validators=[phone_validator]
    )
    wechat = models.CharField("微信号", max_length=100, blank=True, default="")
    bank_card_no = models.CharField("银行卡号", max_length=30, blank=True, default="")
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="foremen",
        verbose_name="分公司",
    )
    city = models.CharField("城市", max_length=50, blank=True, default="")
    commission_rate = models.DecimalField(
        "抽成比例(%)", max_digits=5, decimal_places=2, default=0
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=[
            ("active", "在职"),
            ("resigned", "离职"),
            ("disabled", "禁用"),
        ],
        default="active",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="foreman_profile",
        verbose_name="关联系统用户",
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "foremen"
        verbose_name = "工头"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class WageStandard(models.Model):
    """工费标准模板"""

    name = models.CharField("模板名称", max_length=100)
    skill_type = models.CharField(
        "技能类型", max_length=20, choices=WorkerSkillType.CHOICES
    )
    billing_type = models.CharField(
        "计费方式", max_length=20, choices=WageBillingType.CHOICES
    )
    unit_price = models.DecimalField("单价", max_digits=10, decimal_places=2, default=0)
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wage_standards",
        verbose_name="分公司",
    )
    product_line = models.CharField(
        "产品线细分", max_length=20, blank=True, default="", help_text="安装/送货按产品细分"
    )
    is_default = models.BooleanField("是否默认模板", default=False)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "wage_standards"
        verbose_name = "工费标准"
        verbose_name_plural = verbose_name

    def __str__(self):
        return f"{self.name} ({self.get_skill_type_display()})"


class WageSettlement(models.Model):
    """月结算记录"""

    worker = models.ForeignKey(
        Worker, on_delete=models.CASCADE, related_name="settlements", verbose_name="师傅"
    )
    month = models.DateField("结算月份", help_text="格式：YYYY-MM-01")
    measurement_fee = models.DecimalField(
        "量尺费", max_digits=10, decimal_places=2, default=0
    )
    installation_fee = models.DecimalField(
        "安装费", max_digits=10, decimal_places=2, default=0
    )
    maintenance_fee = models.DecimalField(
        "维修费", max_digits=10, decimal_places=2, default=0
    )
    delivery_fee = models.DecimalField(
        "送货费", max_digits=10, decimal_places=2, default=0
    )
    subsidy = models.DecimalField("补贴", max_digits=10, decimal_places=2, default=0)
    deduction = models.DecimalField(
        "扣费", max_digits=10, decimal_places=2, default=0, help_text="责任扣费等"
    )
    total_fee = models.DecimalField("总工费", max_digits=10, decimal_places=2, default=0)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=[
            ("pending", "待确认"),
            ("confirmed", "已确认"),
            ("paid", "已支付"),
        ],
        default="pending",
    )
    confirmed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wage_confirmations",
        verbose_name="确认人",
    )
    notes = models.TextField("备注", blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "wage_settlements"
        verbose_name = "月结算记录"
        verbose_name_plural = verbose_name
        unique_together = ["worker", "month"]
        ordering = ["-month"]

    def __str__(self):
        return f"{self.worker.name} - {self.month:%Y-%m}"


class ContractModeSetting(models.Model):
    """承包模式设置 - 按地区+品类"""

    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.CASCADE,
        related_name="contract_settings",
        verbose_name="分公司",
    )
    product_line = models.CharField(
        "产品线",
        max_length=20,
        choices=[
            ("wood", "木门"),
            ("alloy", "合金门"),
            ("security", "防盗门"),
        ],
    )
    contract_mode = models.CharField(
        "承包模式", max_length=20, choices=ContractMode.CHOICES
    )
    contractor_name = models.CharField("承包商名称", max_length=100, blank=True, default="")
    settlement_price = models.DecimalField(
        "承包结算价", max_digits=12, decimal_places=2, default=0
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "contract_mode_settings"
        verbose_name = "承包模式设置"
        verbose_name_plural = verbose_name
        unique_together = ["branch", "product_line"]

    def __str__(self):
        return f"{self.branch.name} - {self.get_product_line_display()}"
