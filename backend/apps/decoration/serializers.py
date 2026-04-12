"""
decoration app - 序列化器
"""
from rest_framework import serializers

from .models import Brand, DecorationStaff, Store


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class StoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)

    class Meta:
        model = Store
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class DecorationStaffSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    brand_name = serializers.CharField(source="store.brand.name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = DecorationStaff
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
