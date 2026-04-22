# -*- coding: utf-8 -*-

"""
warehouse app - 序列化器
"""

from rest_framework import serializers

from .models import (
    AccessoryInventory,
    HardwareInventory,
    PendingGoods,
    StockRecord,
    WarehouseProduct,
    WarehouseTransfer,
)


class WarehouseProductSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(
        source="operator.real_name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    # 批次1新增：从关联订单取品牌/门店信息
    brand_name = serializers.CharField(
        source="order.brand.name", read_only=True, default=""
    )
    store_name = serializers.CharField(
        source="order.store.name", read_only=True, default=""
    )
    order_no_display = serializers.CharField(
        source="order.order_no", read_only=True, default=""
    )
    order_status_display = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_order_status_display(self, obj):
        if obj.order_status:
            from common.enums import OrderStatus

            for val, label in OrderStatus.CHOICES:
                if val == obj.order_status:
                    return label
        return ""


class HardwareInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HardwareInventory
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class AccessoryInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessoryInventory
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class PendingGoodsSerializer(serializers.ModelSerializer):
    match_status_display = serializers.CharField(
        source="get_match_status_display", read_only=True
    )

    class Meta:
        model = PendingGoods
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class WarehouseTransferSerializer(serializers.ModelSerializer):
    initiated_by_name = serializers.CharField(
        source="initiated_by.real_name", read_only=True, default=""
    )
    confirmed_by_name = serializers.CharField(
        source="confirmed_by.real_name", read_only=True, default=""
    )

    class Meta:
        model = WarehouseTransfer
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class StocktakeSerializer(serializers.Serializer):
    """盘点序列化器"""

    warehouse_type = serializers.ChoiceField(
        choices=["hardware", "accessory", "pending"], help_text="仓库类型"
    )
    item_id = serializers.IntegerField(help_text="物品ID")
    actual_quantity = serializers.IntegerField(min_value=0, help_text="实盘数量")


class BulkImportSerializer(serializers.Serializer):
    """批量导入序列化器"""

    file = serializers.FileField(help_text="Excel文件（.xlsx）")


class StockRecordSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(
        source="operator.username", read_only=True, default=""
    )

    class Meta:
        model = StockRecord
        fields = "__all__"
        read_only_fields = ["created_at"]
