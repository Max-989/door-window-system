# -*- coding: utf-8 -*-

"""
orders app - 订单管理
按需求文档第九节重构：10个状态、来源、生产子状态、品牌门店关联
"""

from django.db import models

from common.enums import OrderSource, OrderStatus, OrderType, ProductLine
from common.validators import phone_validator


class Order(models.Model):
    """订单"""

    order_no = models.CharField("订单编号", max_length=50, unique=True, db_index=True)

    # 来源与关联
    source = models.CharField(
        "来源", max_length=20, choices=OrderSource.CHOICES, db_index=True
    )
    brand = models.ForeignKey(
        "decoration.Brand",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="品牌",
    )
    store = models.ForeignKey(
        "decoration.Store",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="门店",
    )
    salesperson = models.ForeignKey(
        "decoration.DecorationStaff",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="导购/项目经理",
    )
    branch = models.ForeignKey(
        "users.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="分公司",
    )

    # 订单类型
    order_type = models.CharField(
        "订单类型", max_length=20, choices=OrderType.CHOICES, default=OrderType.MAIN
    )
    parent_order = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sub_orders",
        verbose_name="主单",
    )

    # 客户信息
    customer_name = models.CharField("客户姓名", max_length=50, blank=True, default="")
    customer_phone = models.CharField(
        "客户电话",
        max_length=20,
        blank=True,
        default="",
        validators=[phone_validator],
        db_index=True,
    )
    customer_address = models.CharField("客户地址", max_length=500, db_index=True)
    province = models.CharField(
        "省", max_length=50, blank=True, default="", db_index=True
    )
    city = models.CharField("市", max_length=50, blank=True, default="", db_index=True)
    district = models.CharField("区", max_length=50, blank=True, default="")

    # 价格
    customer_price = models.DecimalField(
        "客户售价", max_digits=12, decimal_places=2, default=0
    )
    cost_price = models.DecimalField(
        "成本价",
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="系统计算，付给工厂",
    )

    # 状态
    status = models.CharField(
        "订单状态",
        max_length=20,
        choices=OrderStatus.CHOICES,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    product_line = models.CharField(
        "产品线",
        max_length=20,
        choices=ProductLine.CHOICES,
        help_text="木门/合金门/防盗门",
    )

    # 创建信息
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_orders",
        verbose_name="创建人",
    )
    confirmed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_orders",
        verbose_name="确认人",
    )

    # 关联量尺
    measurements = models.ManyToManyField(
        "measurements.MeasurementTask",
        blank=True,
        related_name="orders",
        verbose_name="关联量尺任务",
    )

    # 备注
    notes = models.TextField("备注", blank=True, default="")

    # 导购信息
    salesman_name = models.CharField("导购姓名", max_length=50, blank=True, default="")
    salesman_phone = models.CharField(
        "导购电话", max_length=20, blank=True, default="", validators=[phone_validator]
    )

    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "orders"
        verbose_name = "订单"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_no


class OrderItem(models.Model):
    """订单产品明细 - 按产品线细分"""

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items", verbose_name="订单"
    )

    # 产品关联（按产品线不同指向不同表）
    product_type = models.CharField(
        "产品类型", max_length=20, choices=ProductLine.CHOICES
    )
    wood_product = models.ForeignKey(
        "products.WoodProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="木门产品",
    )
    alloy_product = models.ForeignKey(
        "products.AlloyProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="合金门产品",
    )
    security_product = models.ForeignKey(
        "products.SecurityProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="防盗门产品",
    )

    # 产品信息快照
    product_name = models.CharField("产品名称", max_length=200)
    product_model = models.CharField("产品型号", max_length=100, blank=True, default="")
    color = models.CharField("颜色", max_length=50, blank=True, default="")
    specs = models.JSONField(
        "规格参数", default=dict, blank=True, help_text="每樘单独规格记录"
    )

    # 数量与价格
    quantity = models.IntegerField("数量", default=1)
    unit_cost_price = models.DecimalField(
        "单位成本价", max_digits=12, decimal_places=2, default=0
    )

    # 关联五金
    hardware_items = models.JSONField(
        "五金配件", default=list, blank=True, help_text="五金名称+型号+数量"
    )

    notes = models.TextField("备注", blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "order_items"
        verbose_name = "订单明细"
        verbose_name_plural = verbose_name

    def __str__(self):
        return f"{self.order.order_no} - {self.product_name}"


class OrderChangeLog(models.Model):
    """订单修改日志"""

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="change_logs", verbose_name="订单"
    )
    operator = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_change_logs",
        verbose_name="操作人",
    )
    change_content = models.TextField("修改内容", help_text="修改前→修改后")
    created_at = models.DateTimeField("修改时间", auto_now_add=True)

    class Meta:
        db_table = "order_change_logs"
        verbose_name = "订单修改日志"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order.order_no} - {self.id}"
