# -*- coding: utf-8 -*-

"""
products app - 序列化器
"""
from rest_framework import serializers

from .models import (
    AlloyProduct,
    Hardware,
    ProductCategory,
    SecurityProduct,
    Supplier,
    WoodProduct,
)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = "__all__"


class WoodProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=""
    )
    surface_process_display = serializers.CharField(
        source="get_surface_process_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WoodProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class AlloyProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=""
    )
    open_method_display = serializers.CharField(
        source="get_open_method_display", read_only=True
    )
    track_type_display = serializers.CharField(
        source="get_track_type_display", read_only=True
    )
    glass_type_display = serializers.CharField(
        source="get_glass_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AlloyProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class SecurityProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=""
    )
    open_method_display = serializers.CharField(
        source="get_open_method_display", read_only=True
    )
    open_direction_display = serializers.CharField(
        source="get_open_direction_display", read_only=True
    )
    size_type_display = serializers.CharField(
        source="get_size_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SecurityProduct
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class HardwareSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(
        source="supplier.name", read_only=True, default=""
    )
    hardware_type_display = serializers.CharField(
        source="get_hardware_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Hardware
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


# ── 产品搜索序列化器（精简字段） ──────────────────────────


class WoodProductSearchSerializer(serializers.ModelSerializer):
    """木门搜索结果"""

    product_line = serializers.SerializerMethodField()

    class Meta:
        model = WoodProduct
        fields = [
            "id",
            "name",
            "product_line",
            "surface_process",
            "model",
            "colors",
            "cost_price",
        ]

    def get_product_line(self, obj):
        return "wood"


class AlloyProductSearchSerializer(serializers.ModelSerializer):
    """合金门搜索结果"""

    product_line = serializers.SerializerMethodField()

    class Meta:
        model = AlloyProduct
        fields = [
            "id",
            "name",
            "product_line",
            "open_method",
            "track_type",
            "profile",
            "colors",
            "glass_type",
            "glass_kind",
            "unit_price",
        ]

    def get_product_line(self, obj):
        return "alloy"


class SecurityProductSearchSerializer(serializers.ModelSerializer):
    """防盗门搜索结果"""

    product_line = serializers.SerializerMethodField()

    class Meta:
        model = SecurityProduct
        fields = [
            "id",
            "name",
            "product_line",
            "model",
            "door_colors",
            "open_method",
            "open_direction",
            "size_type",
            "standard_sizes",
            "standard_price",
            "custom_price",
            "smart_lock_upcharge",
        ]

    def get_product_line(self, obj):
        return "security"
