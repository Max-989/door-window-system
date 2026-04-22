# -*- coding: utf-8 -*-

"""
权限管理视图集
"""
from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Menu,
    PermissionLog,
    Role,
    RoleFieldPermission,
    RoleMember,
    RoleMenuPermission,
)
from .serializers import (
    AssignMembersSerializer,
    AssignMenusSerializer,
    MenuFlatSerializer,
    MenuTreeSerializer,
    PermissionLogSerializer,
    RoleFieldPermissionSerializer,
    RoleListSerializer,
    RoleSerializer,
)


def _log_perm(operator, action, target, detail=None):
    """记录权限操作日志"""
    PermissionLog.objects.create(
        operator=operator, action=action, target=target, detail=detail or {}
    )


def _build_menu_tree(menus):
    """将菜单列表构建为树形结构"""
    from collections import defaultdict

    mapping = {m["id"]: {**m, "children": []} for m in menus}
    tree = []
    for m in menus:
        parent_id = m.get("parent")
        if parent_id and parent_id in mapping:
            mapping[parent_id]["children"].append(mapping[m["id"]])
        else:
            tree.append(mapping[m["id"]])
    tree.sort(key=lambda x: (x["sort_order"], x["id"]))
    for node in tree:
        node["children"].sort(key=lambda x: (x["sort_order"], x["id"]))
    return tree


class RoleViewSet(viewsets.ModelViewSet):
    """角色管理"""

    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return RoleListSerializer
        return RoleSerializer

    def perform_create(self, serializer):
        role = serializer.save()
        _log_perm(self.request.user, "创建角色", role.name, serializer.data)

    def perform_update(self, serializer):
        role = serializer.save()
        _log_perm(self.request.user, "更新角色", role.name, serializer.data)

    def perform_destroy(self, instance):
        name = instance.name
        _log_perm(self.request.user, "删除角色", name, {"id": instance.id})
        instance.delete()

    @action(detail=True, methods=["post"], url_path="assign-menus")
    def assign_menus(self, request, pk=None):
        """批量设置角色菜单权限"""
        role = self.get_object()
        serializer = AssignMenusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        menu_ids = serializer.validated_data["menu_ids"]

        old_ids = set(role.menu_permissions.values_list("menu_id", flat=True))
        new_ids = set(menu_ids)
        added = new_ids - old_ids
        removed = old_ids - new_ids

        # 清除旧权限，设置新权限
        role.menu_permissions.all().delete()
        for menu_id in menu_ids:
            RoleMenuPermission.objects.create(role=role, menu_id=menu_id)

        _log_perm(
            request.user,
            "分配菜单权限",
            role.name,
            {
                "added_count": len(added),
                "removed_count": len(removed),
                "total": len(menu_ids),
            },
        )
        return Response({"detail": f"已分配 {len(menu_ids)} 个菜单权限"})

    @action(detail=True, methods=["post"], url_path="assign-members")
    def assign_members(self, request, pk=None):
        """批量分配角色成员"""
        role = self.get_object()
        serializer = AssignMembersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_ids = serializer.validated_data["user_ids"]

        old_ids = set(role.members.values_list("user_id", flat=True))
        new_ids = set(user_ids)
        added = new_ids - old_ids
        removed = old_ids - new_ids

        role.members.all().delete()
        for uid in user_ids:
            RoleMember.objects.create(role=role, user_id=uid)

        _log_perm(
            request.user,
            "分配角色成员",
            role.name,
            {
                "added_count": len(added),
                "removed_count": len(removed),
                "total": len(user_ids),
            },
        )
        return Response({"detail": f"已分配 {len(user_ids)} 个成员"})


class MenuViewSet(viewsets.ReadOnlyModelViewSet):
    """菜单管理"""

    queryset = Menu.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return MenuFlatSerializer
        return MenuFlatSerializer

    def list(self, request, *args, **kwargs):
        """返回树形菜单结构"""
        menus = Menu.objects.all().order_by("sort_order", "id")
        serializer = MenuFlatSerializer(menus, many=True)
        tree = _build_menu_tree(serializer.data)
        return Response(tree)


class PermissionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """权限操作日志管理"""

    queryset = PermissionLog.objects.all()
    serializer_class = PermissionLogSerializer
    permission_classes = [IsAuthenticated]
    ordering = ["-created_at"]


class MyMenusView(viewsets.ViewSet):
    """当前用户菜单API"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        # 超级用户看到所有菜单
        if user.is_superuser:
            menus = Menu.objects.filter(is_visible=True, menu_type="menu")
        else:
            # 获取用户角色对应的菜单
            role_ids = RoleMember.objects.filter(user=user).values_list(
                "role_id", flat=True
            )
            menu_ids = RoleMenuPermission.objects.filter(
                role_id__in=role_ids
            ).values_list("menu_id", flat=True)
            menus = Menu.objects.filter(id__in=menu_ids, is_visible=True)

        menus = menus.order_by("sort_order", "id")
        serializer = MenuFlatSerializer(menus, many=True)
        tree = _build_menu_tree(serializer.data)
        return Response(tree)


class MyPermissionsView(viewsets.ViewSet):
    """当前用户权限码API"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        user = request.user
        if user.is_superuser:
            codes = list(Menu.objects.values_list("code", flat=True))
        else:
            role_ids = RoleMember.objects.filter(user=user).values_list(
                "role_id", flat=True
            )
            codes = list(
                RoleMenuPermission.objects.filter(role_id__in=role_ids)
                .values_list("menu__code", flat=True)
                .distinct()
            )
        return Response({"permissions": codes})
