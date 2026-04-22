# -*- coding: utf-8 -*-

"""
decoration app - 装企管理
按需求文档第十四节新增
"""
from django.db import models

from common.enums import DecorationStaffRole, DecorationStatus
from common.validators import phone_or_landline_validator, phone_validator


class Brand(models.Model):
    """品牌"""

    name = models.CharField("品牌名称", max_length=200)
    contact_person = models.CharField("联系人", max_length=50, blank=True, default="")
    phone = models.CharField(
        "联系电话",
        max_length=20,
        blank=True,
        default="",
        validators=[phone_or_landline_validator],
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=DecorationStatus.CHOICES,
        default=DecorationStatus.COOPERATING,
    )
    process_order = models.CharField(
        max_length=20,
        choices=[
            ("measure_first", "先量尺后下单"),
            ("order_first", "先下单后量尺"),
        ],
        default="measure_first",
        verbose_name="流程顺序",
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "brands"
        verbose_name = "品牌"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Store(models.Model):
    """门店"""

    brand = models.ForeignKey(
        Brand, on_delete=models.CASCADE, related_name="stores", verbose_name="品牌"
    )
    name = models.CharField("门店名称", max_length=200)
    address = models.CharField("地址", max_length=500)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=DecorationStatus.CHOICES,
        default=DecorationStatus.COOPERATING,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "stores"
        verbose_name = "门店"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.brand.name} - {self.name}"


class DecorationStaff(models.Model):
    """装企人员"""

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name="staff", verbose_name="门店"
    )
    name = models.CharField("姓名", max_length=50)
    phone = models.CharField("手机号", max_length=20, validators=[phone_validator])
    wechat = models.CharField("微信号", max_length=100, blank=True, default="")
    role = models.CharField("角色", max_length=20, choices=DecorationStaffRole.CHOICES)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=DecorationStatus.CHOICES,
        default=DecorationStatus.COOPERATING,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "decoration_staff"
        verbose_name = "装企人员"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"
