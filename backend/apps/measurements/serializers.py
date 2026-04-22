# -*- coding: utf-8 -*-

"""
measurements app - 序列化器
"""
from rest_framework import serializers

from .models import MeasurementTask


class MeasurementTaskListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    assigned_to_name = serializers.CharField(
        source="assigned_to.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MeasurementTask
        fields = [
            "id",
            "task_no",
            "source",
            "brand_name",
            "store_name",
            "customer_name",
            "customer_phone",
            "customer_address",
            "assigned_to",
            "assigned_to_name",
            "status",
            "status_display",
            "wage_amount",
            "created_at",
            "assigned_at",
        ]


class MeasurementTaskCreateSerializer(serializers.ModelSerializer):
    task_no = serializers.CharField(read_only=True)  # Auto-generated

    class Meta:
        model = MeasurementTask
        fields = [
            "id",
            "task_no",
            "source",
            "brand",
            "store",
            "requested_by",
            "branch",
            "customer_name",
            "customer_phone",
            "customer_address",
            "product_details",
            "assigned_to",
            "notes",
        ]
        read_only_fields = ["id", "task_no"]


class MeasurementTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeasurementTask
        fields = [
            "assigned_to",
            "status",
            "site_photos",
            "measurement_data",
            "completed_at",
            "wage_amount",
            "notes",
        ]


class MeasurementTaskDetailSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    assigned_to_name = serializers.CharField(
        source="assigned_to.name", read_only=True, default=""
    )
    assigned_by_name = serializers.CharField(
        source="assigned_by.real_name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MeasurementTask
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
