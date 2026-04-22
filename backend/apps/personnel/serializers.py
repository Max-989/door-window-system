# -*- coding: utf-8 -*-

"""
personnel app - 序列化器
"""

from rest_framework import serializers

from .models import ContractModeSetting, Foreman, WageSettlement, WageStandard, Worker


class WorkerListSerializer(serializers.ModelSerializer):
    foreman_name = serializers.CharField(
        source="foreman.name", read_only=True, default=""
    )
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Worker
        fields = [
            "id",
            "name",
            "phone",
            "wechat",
            "skills",
            "foreman",
            "foreman_name",
            "branch",
            "branch_name",
            "city",
            "status",
            "status_display",
            "created_at",
        ]


class WorkerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = [
            "name",
            "phone",
            "wechat",
            "bank_card_no",
            "skills",
            "foreman",
            "branch",
            "city",
            "wage_standard",
            "user",
            "status",
        ]


class WorkerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = [
            "name",
            "wechat",
            "bank_card_no",
            "skills",
            "foreman",
            "branch",
            "city",
            "wage_standard",
            "status",
        ]


class WorkerDetailSerializer(serializers.ModelSerializer):
    foreman_name = serializers.CharField(
        source="foreman.name", read_only=True, default=""
    )
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    wage_standard_name = serializers.CharField(
        source="wage_standard.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Worker
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class ForemanSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Foreman
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class WageStandardSerializer(serializers.ModelSerializer):
    skill_type_display = serializers.CharField(
        source="get_skill_type_display", read_only=True
    )
    billing_type_display = serializers.CharField(
        source="get_billing_type_display", read_only=True
    )
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )

    class Meta:
        model = WageStandard
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class WageSettlementSerializer(serializers.ModelSerializer):
    worker_name = serializers.CharField(source="worker.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WageSettlement
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class ContractModeSettingSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    product_line_display = serializers.CharField(
        source="get_product_line_display", read_only=True
    )
    contract_mode_display = serializers.CharField(
        source="get_contract_mode_display", read_only=True
    )

    class Meta:
        model = ContractModeSetting
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]
