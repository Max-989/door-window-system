"""
权限管理序列化器
"""
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Menu,
    PermissionLog,
    Role,
    RoleFieldPermission,
    RoleMember,
    RoleMenuPermission,
)


class MenuTreeSerializer(serializers.ModelSerializer):
    """菜单树形序列化器"""

    children = serializers.SerializerMethodField()

    class Meta:
        model = Menu
        fields = [
            "id",
            "name",
            "code",
            "parent",
            "path",
            "icon",
            "sort_order",
            "menu_type",
            "is_visible",
            "children",
        ]

    def get_children(self, obj):
        children = obj.children.filter(is_visible=True).order_by("sort_order", "id")
        return MenuTreeSerializer(children, many=True, context=self.context).data


class MenuFlatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = "__all__"


class RoleSerializer(serializers.ModelSerializer):
    menu_ids = serializers.PrimaryKeyRelatedField(
        source="menu_permissions",
        many=True,
        queryset=Menu.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Role
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance and self.instance.is_system:
            # 系统预设角色不允许修改名称和数据范围
            attrs.pop("is_system", None)
        return attrs


class RoleListSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = "__all__"

    def get_member_count(self, obj):
        return obj.members.count()


class RoleFieldPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleFieldPermission
        fields = "__all__"


class PermissionLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(
        source="operator.username", default="系统", read_only=True
    )

    class Meta:
        model = PermissionLog
        fields = "__all__"


class AssignMenusSerializer(serializers.Serializer):
    menu_ids = serializers.ListField(child=serializers.IntegerField(), min_length=0)


class AssignMembersSerializer(serializers.Serializer):
    user_ids = serializers.ListField(child=serializers.IntegerField(), min_length=0)
