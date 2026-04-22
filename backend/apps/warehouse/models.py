# -*- coding: utf-8 -*-

"""
warehouse app - 仓库管理
按需求文档第十五节重构
"""
from django.db import models

from common.enums import PendingGoodsMatchStatus, WarehouseProductStatus


class WarehouseProduct(models.Model):
    """产品流转仓"""

    order_no = models.CharField("订单号", max_length=50, db_index=True)
    product_type = models.CharField("产品类型", max_length=20, help_text="木门/合金门/防盗门")
    product_model = models.CharField("产品型号", max_length=100, blank=True, default="")
    lock_model = models.CharField("锁具型号", max_length=100, blank=True, default="")
    quantity = models.IntegerField("数量", default=1)
    status = models.CharField(
        "状态",
        max_length=20,
        choices=WarehouseProductStatus.CHOICES,
        default=WarehouseProductStatus.PENDING_SHIP,
    )
    logistics_no = models.CharField("物流单号", max_length=100, blank=True, default="")
    pickup_time = models.DateTimeField("提货时间", null=True, blank=True)
    delivery_photos = models.JSONField("派送图片", default=list, blank=True)
    city = models.CharField("城市", max_length=50, blank=True, default="")
    operator = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="warehouse_operations",
        verbose_name="操作人",
    )

    # 订单关联（批次1改造）
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="warehouse_products",
        verbose_name="关联订单",
    )
    order_status = models.CharField(
        max_length=20, blank=True, default="", verbose_name="订单状态"
    )
    auto_generated = models.BooleanField(default=False, verbose_name="自动生成")

    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "warehouse_products"
        verbose_name = "产品流转仓"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_no} - {self.product_model}"


class HardwareInventory(models.Model):
    """五金仓"""

    name = models.CharField("五金名称", max_length=200)
    hardware_type = models.CharField("类型", max_length=20, help_text="木门/合金门/防盗门用")
    current_stock = models.IntegerField("当前库存", default=0)
    alert_quantity = models.IntegerField("预警数量", default=0)
    purchasing_quantity = models.IntegerField("采购中数量", default=0)
    pending_out_quantity = models.IntegerField(
        "待出库需求量", default=0, help_text="确认后20天内订单"
    )
    available_stock = models.IntegerField("可用库存", default=0)
    city = models.CharField("城市", max_length=50, blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "hardware_inventory"
        verbose_name = "五金仓"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class AccessoryInventory(models.Model):
    """配件仓"""

    name = models.CharField("配件名称", max_length=200)
    spec_model = models.CharField("规格型号", max_length=200, blank=True, default="")
    current_stock = models.IntegerField("当前库存", default=0)
    purchasing_quantity = models.IntegerField("采购中数量", default=0)
    city = models.CharField("城市", max_length=50, blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "accessory_inventory"
        verbose_name = "配件仓"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class PendingGoods(models.Model):
    """货品暂存仓"""

    goods_name = models.CharField("货品名称/型号", max_length=200)
    door_type = models.CharField("门种类", max_length=20, help_text="木门/合金门/防盗门")
    spec_size = models.JSONField("规格尺寸", default=dict, blank=True, help_text="详细拆分")
    color = models.CharField("颜色", max_length=50, blank=True, default="")
    other_config = models.TextField("其他配置", blank=True, default="")
    inbound_time = models.DateTimeField("入库时间", auto_now_add=True)
    inbound_reason = models.CharField("入库原因", max_length=200, blank=True, default="")
    match_status = models.CharField(
        "匹配状态",
        max_length=20,
        choices=PendingGoodsMatchStatus.CHOICES,
        default=PendingGoodsMatchStatus.UNMATCHED,
    )
    matched_order_no = models.CharField("匹配订单号", max_length=50, blank=True, default="")
    city = models.CharField("城市", max_length=50, blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "pending_goods"
        verbose_name = "货品暂存仓"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.goods_name


class WarehouseTransfer(models.Model):
    """城市间调拨"""

    from_city = models.CharField("调出城市", max_length=50)
    to_city = models.CharField("调入城市", max_length=50)
    goods_info = models.TextField("调拨货品信息", blank=True, default="")
    status = models.CharField(
        "状态",
        max_length=20,
        default="pending",
        help_text="pending/confirmed/transit/completed",
    )
    initiated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_initiated",
        verbose_name="发起人",
    )
    confirmed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_confirmed",
        verbose_name="确认人",
    )
    notes = models.TextField("备注", blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "warehouse_transfers"
        verbose_name = "城市间调拨"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.from_city} → {self.to_city}"


class StockRecord(models.Model):
    """出入库记录"""

    ITEM_TYPE_CHOICES = [
        ("hardware", "五金"),
        ("accessory", "配件"),
    ]
    RECORD_TYPE_CHOICES = [
        ("in", "入库"),
        ("out", "出库"),
    ]

    item_type = models.CharField("物品类型", max_length=20, choices=ITEM_TYPE_CHOICES)
    item_id = models.IntegerField("物品ID")
    record_type = models.CharField("记录类型", max_length=10, choices=RECORD_TYPE_CHOICES)
    quantity = models.IntegerField("数量")
    reason = models.TextField("原因", blank=True, default="")
    operator = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="操作人",
    )
    related_task_id = models.CharField("关联任务ID", max_length=50, blank=True, default="")
    supplier = models.CharField("供应商", max_length=200, blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "stock_records"
        verbose_name = "出入库记录"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_item_type_display()}] {self.get_record_type_display()} {self.quantity} (ID: {self.item_id})"
