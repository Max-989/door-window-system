# -*- coding: utf-8 -*-

"""
products app - 产品库管理
按需求文档第十六节重构：木门、合金门、防盗门、五金配件、供货厂家
"""

from django.db import models

from common.enums import (
    AlloyOpenMethod,
    AlloyTrackType,
    GlassType,
    HardwareSubType,
    HardwareType,
    ProductLine,
    ProductStatus,
    SecurityOpenDirection,
    SecurityOpenMethod,
    SecuritySizeType,
    WoodSurfaceProcess,
)
from common.validators import phone_or_landline_validator


class Supplier(models.Model):
    """供货厂家"""

    name = models.CharField("厂家名称", max_length=200)
    product_type = models.CharField("产品类型", max_length=20, choices=ProductLine.CHOICES)
    contact_person = models.CharField("联系人", max_length=50, blank=True, default="")
    phone = models.CharField(
        "联系电话",
        max_length=20,
        blank=True,
        default="",
        validators=[phone_or_landline_validator],
    )
    address = models.CharField("地址", max_length=500, blank=True, default="")
    status = models.CharField(
        "状态",
        max_length=20,
        choices=ProductStatus.CHOICES,
        default=ProductStatus.ON_SALE,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "suppliers"
        verbose_name = "供货厂家"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class ProductCategory(models.Model):
    """产品线分类（可扩展）"""

    name = models.CharField("产品线名称", max_length=50, unique=True)
    code = models.CharField("产品线代码", max_length=20, unique=True)
    sort_order = models.IntegerField("排序", default=0)
    is_active = models.BooleanField("是否启用", default=True)

    class Meta:
        db_table = "product_categories"
        verbose_name = "产品线分类"
        verbose_name_plural = verbose_name
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class WoodProduct(models.Model):
    """木门产品库"""

    name = models.CharField("产品名称", max_length=200)
    surface_process = models.CharField(
        "表面工艺", max_length=20, choices=WoodSurfaceProcess.CHOICES
    )
    model = models.CharField("型号", max_length=100, blank=True, default="")
    colors = models.JSONField(
        "颜色", default=list, blank=True, help_text='多选，如["白色","原木色"]'
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wood_products",
        verbose_name="供货厂家",
    )
    cost_price = models.DecimalField("成本价", max_digits=12, decimal_places=2, default=0)
    image = models.ImageField("产品图片", upload_to="products/wood/", blank=True, null=True)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=ProductStatus.CHOICES,
        default=ProductStatus.ON_SALE,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "wood_products"
        verbose_name = "木门产品"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AlloyProduct(models.Model):
    """合金门产品库"""

    name = models.CharField("产品名称", max_length=200)
    open_method = models.CharField(
        "开启方式", max_length=20, choices=AlloyOpenMethod.CHOICES
    )
    track_type = models.CharField(
        "轨道类型",
        max_length=20,
        choices=AlloyTrackType.CHOICES,
        blank=True,
        default="",
    )
    profile = models.CharField("型材", max_length=100, blank=True, default="")
    colors = models.JSONField("颜色", default=list, blank=True)
    glass_type = models.CharField(
        "玻璃类型", max_length=20, choices=GlassType.CHOICES, blank=True, default=""
    )
    glass_kind = models.CharField("玻璃种类", max_length=100, blank=True, default="")
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alloy_products",
        verbose_name="供货厂家",
    )
    pricing_method = models.CharField("计价方式", max_length=20, blank=True, default="")
    unit_price = models.DecimalField(
        "单价（平方）", max_digits=12, decimal_places=2, default=0
    )
    oversize_fee = models.DecimalField(
        "超尺费", max_digits=12, decimal_places=2, default=0, help_text="按供货厂家设置"
    )
    oversize_rule = models.TextField("超尺费规则", blank=True, default="")
    glass_price = models.DecimalField(
        "玻璃价格", max_digits=12, decimal_places=2, default=0
    )
    image = models.ImageField(
        "产品图片", upload_to="products/alloy/", blank=True, null=True
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=ProductStatus.CHOICES,
        default=ProductStatus.ON_SALE,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "alloy_products"
        verbose_name = "合金门产品"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class SecurityProduct(models.Model):
    """防盗门产品库"""

    name = models.CharField("产品名称", max_length=200)
    model = models.CharField("型号", max_length=100)
    door_colors = models.JSONField("门扇颜色", default=list, blank=True, help_text="可选多选")
    open_method = models.CharField(
        "开启方式", max_length=20, choices=SecurityOpenMethod.CHOICES
    )
    open_direction = models.CharField(
        "开门方向",
        max_length=20,
        choices=SecurityOpenDirection.CHOICES,
        blank=True,
        default="",
    )
    size_type = models.CharField(
        "尺寸类型", max_length=20, choices=SecuritySizeType.CHOICES
    )
    standard_sizes = models.JSONField(
        "标尺尺寸列表", default=list, blank=True, help_text="标尺时可用尺寸"
    )
    frame_type = models.CharField("门框类型", max_length=100, blank=True, default="")
    fixed_config = models.JSONField(
        "固定配置",
        default=dict,
        blank=True,
        help_text="门板材质/表面处理/铰链/填充/密封条/门槛等",
    )
    smart_lock_upcharge = models.DecimalField(
        "智能锁补差价", max_digits=12, decimal_places=2, default=0
    )
    standard_price = models.DecimalField(
        "标尺价", max_digits=12, decimal_places=2, default=0
    )
    custom_price = models.DecimalField(
        "定制价", max_digits=12, decimal_places=2, default=0
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="security_products",
        verbose_name="供货厂家",
    )
    image = models.ImageField(
        "产品图片", upload_to="products/security/", blank=True, null=True
    )
    special_craft_note = models.TextField("特殊工艺备注", blank=True, default="")
    status = models.CharField(
        "状态",
        max_length=20,
        choices=ProductStatus.CHOICES,
        default=ProductStatus.ON_SALE,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "security_products"
        verbose_name = "防盗门产品"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Hardware(models.Model):
    """五金配件库"""

    name = models.CharField("五金名称", max_length=200)
    hardware_type = models.CharField("类型", max_length=20, choices=HardwareType.CHOICES)
    sub_type = models.CharField(
        "子类型", max_length=30, choices=HardwareSubType.CHOICES, blank=True, default=""
    )
    model = models.CharField("型号", max_length=100, blank=True, default="")
    applicable_products = models.JSONField(
        "适用产品", default=list, blank=True, help_text="木门/合金门/防盗门多选"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hardware_items",
        verbose_name="供应商",
    )
    cost_price = models.DecimalField("成本价", max_digits=12, decimal_places=2, default=0)
    image = models.ImageField(
        "产品图片", upload_to="products/hardware/", blank=True, null=True
    )
    status = models.CharField(
        "状态",
        max_length=20,
        choices=ProductStatus.CHOICES,
        default=ProductStatus.ON_SALE,
    )
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "hardware"
        verbose_name = "五金配件"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
