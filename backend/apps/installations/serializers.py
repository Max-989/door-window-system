# -*- coding: utf-8 -*-

"""
installations app - 序列化器
"""
from rest_framework import serializers

from .models import InstallationTask


class InstallationTaskListSerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(
        source="order.order_no", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    installer_names = serializers.SerializerMethodField()

    class Meta:
        model = InstallationTask
        fields = [
            "id",
            "task_no",
            "order",
            "order_no",
            "source",
            "brand",
            "store",
            "customer_name",
            "customer_phone",
            "customer_address",
            "door_quantity",
            "status",
            "status_display",
            "installed_quantity",
            "additional_fee",
            "created_at",
            "assigned_at",
            "installer_names",
        ]

    def get_installer_names(self, obj):
        return [w.name for w in obj.installers.all()]


class InstallationTaskCreateSerializer(serializers.ModelSerializer):
    task_no = serializers.CharField(read_only=True)  # Auto-generated

    class Meta:
        model = InstallationTask
        fields = [
            "id",
            "task_no",
            "order",
            "source",
            "brand",
            "store",
            "branch",
            "customer_name",
            "customer_phone",
            "customer_address",
            "door_types",
            "door_quantity",
            "size_list",
            "installers",
            "notes",
        ]
        read_only_fields = ["id", "task_no"]

    def validate_installers(self, value):
        if not value:
            raise serializers.ValidationError("至少选择一个安装师傅")
        return value


class InstallationTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstallationTask
        fields = [
            "status",
            "installers",
            "room_photos",
            "installed_quantity",
            "additional_items",
            "additional_fee",
            "subsidy",
            "notes",
            "partial_next_type",
            "completed_at",
        ]


class InstallationTaskReviewSerializer(serializers.ModelSerializer):
    """审核序列化器"""

    class Meta:
        model = InstallationTask
        fields = ["status", "reviewed_by"]


class InstallationTaskDetailSerializer(serializers.ModelSerializer):
    order_no = serializers.CharField(
        source="order.order_no", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_by_name = serializers.CharField(
        source="assigned_by.real_name", read_only=True, default=""
    )
    reviewed_by_name = serializers.CharField(
        source="reviewed_by.real_name", read_only=True, default=""
    )
    installer_names = serializers.SerializerMethodField()

    class Meta:
        model = InstallationTask
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_installer_names(self, obj):
        return [w.name for w in obj.installers.all()]
