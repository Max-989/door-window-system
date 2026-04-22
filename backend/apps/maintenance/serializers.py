# -*- coding: utf-8 -*-

"""
maintenance app - 序列化器
"""

from rest_framework import serializers

from .models import MaintenanceTask


class MaintenanceTaskListSerializer(serializers.ModelSerializer):
    original_order_no = serializers.CharField(
        source="original_order.order_no", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.name", read_only=True, default=""
    )
    installer_name = serializers.CharField(
        source="installer.name", read_only=True, default=""
    )
    installation_task_no = serializers.CharField(
        source="installation_task.task_no", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MaintenanceTask
        fields = [
            "id",
            "task_no",
            "source",
            "brand",
            "store",
            "original_order",
            "original_order_no",
            "installation_task",
            "installation_task_no",
            "installer",
            "installer_name",
            "customer_name",
            "customer_phone",
            "customer_address",
            "issue_description",
            "status",
            "status_display",
            "assigned_to",
            "assigned_to_name",
            "responsibility",
            "accessory_reissue",
            "reissue_items",
            "maintenance_fee",
            "wage_amount",
            "created_at",
            "assigned_at",
        ]


class MaintenanceTaskCreateSerializer(serializers.ModelSerializer):
    task_no = serializers.CharField(read_only=True)  # Auto-generated

    class Meta:
        model = MaintenanceTask
        fields = [
            "id",
            "task_no",
            "source",
            "brand",
            "store",
            "branch",
            "original_order",
            "installation_task",
            "installer",
            "customer_name",
            "customer_phone",
            "customer_address",
            "issue_description",
            "site_photos",
            "issue_type",
            "assigned_to",
            "notes",
            "accessory_reissue",
            "reissue_items",
        ]
        read_only_fields = ["id", "task_no"]

    def validate_issue_description(self, value):
        """issue_description 可选，如果为空则填充默认值"""
        if not value:
            # 根据 source 填充默认值
            source = self.initial_data.get("source", "")
            if source == "order":
                return "从订单创建"
            elif source == "installation":
                return "从安装单创建"
            elif source == "independent":
                return "独立创建"
            return "售后单"
        return value

    def validate_reissue_items(self, value):
        """🟡 校验补发配件明细格式"""
        if not value:
            return value
        if not isinstance(value, list):
            raise serializers.ValidationError("reissue_items 必须是数组")
        for i, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"第 {i+1} 个配件必须是对象")
            if not item.get("name") or not isinstance(item.get("name"), str):
                raise serializers.ValidationError(
                    f"第 {i+1} 个配件名称不能为空且必须是字符串"
                )
            quantity = item.get("quantity")
            if not isinstance(quantity, int) or quantity < 1:
                raise serializers.ValidationError(f"第 {i+1} 个配件数量必须是正整数")
            if item.get("type") not in ["hardware", "accessory"]:
                raise serializers.ValidationError(
                    f"第 {i+1} 个配件类型必须是 hardware 或 accessory"
                )
        return value

    def validate(self, attrs):
        """创建时的业务校验"""
        installation_task = attrs.get("installation_task")
        installer = attrs.get("installer")

        # 如果传了 installation_task，自动带出 installer（从安装单的安装工取）
        if installation_task and not installer:
            # 安装单可能有多师傅，取第一个
            first_installer = installation_task.installers.first()
            if first_installer:
                attrs["installer"] = first_installer

        # 如果没传 installation_task，检查是否有关联安装单（通过 original_order 查找）
        if not installation_task:
            original_order = attrs.get("original_order")
            if original_order:
                related_installations = original_order.installation_tasks.filter(
                    status__in=["pending", "assigned", "in_progress", "completed"]
                ).order_by("-created_at")
                if related_installations.exists():
                    # 仅警告，不阻止创建
                    self.context["installation_warning"] = (
                        f"该订单存在关联安装单（{related_installations.first().task_no}），"
                        f"如需关联请指定 installation_task"
                    )

        return attrs


class MaintenanceTaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceTask
        fields = [
            "status",
            "assigned_to",
            "completion_photos",
            "resolution",
            "completed_at",
            "notes",
            "accessory_reissue",
            "reissue_items",
        ]


class MaintenanceTaskReviewSerializer(serializers.ModelSerializer):
    """审核序列化器 - 含责任判定"""

    class Meta:
        model = MaintenanceTask
        fields = [
            "status",
            "responsibility",
            "deduction_worker",
            "deduction_amount",
            "maintenance_fee",
            "wage_amount",
        ]


class MaintenanceTaskDetailSerializer(serializers.ModelSerializer):
    original_order_no = serializers.CharField(
        source="original_order.order_no", read_only=True, default=""
    )
    assigned_to_name = serializers.CharField(
        source="assigned_to.name", read_only=True, default=""
    )
    assigned_by_name = serializers.CharField(
        source="assigned_by.real_name", read_only=True, default=""
    )
    reviewed_by_name = serializers.CharField(
        source="reviewed_by.real_name", read_only=True, default=""
    )
    deduction_worker_name = serializers.CharField(
        source="deduction_worker.name", read_only=True, default=""
    )
    installer_name = serializers.CharField(
        source="installer.name", read_only=True, default=""
    )
    installation_task_no = serializers.CharField(
        source="installation_task.task_no", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    responsibility_display = serializers.CharField(
        source="get_responsibility_display", read_only=True
    )

    class Meta:
        model = MaintenanceTask
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class CreateFromOrderSerializer(serializers.Serializer):
    """从订单创建售后单"""

    order_id = serializers.IntegerField(required=True, help_text="订单ID")
    installation_task_id = serializers.IntegerField(
        required=False, help_text="安装单ID（可选）"
    )
    issue_description = serializers.CharField(
        required=False,
        default="从订单创建",
        help_text='问题描述（可选，默认"从订单创建"）',
    )
    site_photos = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    issue_type = serializers.CharField(required=False, default="")
    notes = serializers.CharField(required=False, default="")


class CreateFromInstallationSerializer(serializers.Serializer):
    """从安装单创建售后单"""

    installation_task_id = serializers.IntegerField(required=True, help_text="安装单ID")
    issue_description = serializers.CharField(
        required=False,
        default="从安装单创建",
        help_text='问题描述（可选，默认"从安装单创建"）',
    )
    site_photos = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    issue_type = serializers.CharField(required=False, default="")
    notes = serializers.CharField(required=False, default="")
