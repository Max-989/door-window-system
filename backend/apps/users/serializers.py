# -*- coding: utf-8 -*-

"""
users app - 序列化器
"""

from rest_framework import serializers

from .models import Branch, Permission, User, UserProfile, UserRole


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class BranchListSerializer(BranchSerializer):
    class Meta(BranchSerializer.Meta):
        fields = ["id", "name", "city", "is_active"]


class UserListSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    identity_display = serializers.CharField(
        source="get_identity_display", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "phone",
            "real_name",
            "identity",
            "identity_display",
            "branch",
            "branch_name",
            "city",
            "product_line",
            "status",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "phone",
            "real_name",
            "wechat_open_id",
            "identity",
            "branch",
            "city",
            "product_line",
            "password",
        ]
        extra_kwargs = {"password": {"write_only": True, "required": False}}

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "real_name",
            "identity",
            "branch",
            "city",
            "product_line",
            "status",
            "avatar",
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, default=""
    )
    identity_display = serializers.CharField(
        source="get_identity_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = User
        fields = "__all__"
        read_only_fields = ["password", "last_login_at", "created_at", "updated_at"]


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class PendingUserSerializer(serializers.ModelSerializer):
    """待审核用户序列化器"""

    phone = serializers.CharField(source="user.phone", read_only=True)
    real_name = serializers.CharField(source="user.real_name", read_only=True)
    user_type_display = serializers.CharField(
        source="get_user_type_display", read_only=True
    )
    brand_name = serializers.CharField(source="brand.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            "id",
            "phone",
            "real_name",
            "user_type",
            "user_type_display",
            "brand",
            "brand_name",
            "store",
            "store_name",
            "status",
            "created_at",
        ]


class ApproveSerializer(serializers.Serializer):
    role_id = serializers.IntegerField(required=False, allow_null=True)
    department = serializers.CharField(required=False, default="")
