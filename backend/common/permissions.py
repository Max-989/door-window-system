"""
自定义权限类
"""
from rest_framework.permissions import BasePermission


class IsRole(BasePermission):
    """角色级别权限"""

    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) in self.allowed_roles


class IsAdmin(IsRole):
    allowed_roles = ["admin"]


class IsAdminOrManager(IsRole):
    allowed_roles = ["admin", "manager"]


class IsSalesOrAbove(IsRole):
    allowed_roles = ["admin", "manager", "sales"]


class IsInstaller(BasePermission):
    """安装师傅权限"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) == "installer"


class IsCustomer(BasePermission):
    """客户权限"""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, "role", None) == "customer"


class IsOwnerOrAdmin(BasePermission):
    """数据级别权限：本人或管理员"""

    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        user_field = getattr(obj, "user_id", None) or getattr(obj, "created_by", None)
        return user_field == request.user.id
