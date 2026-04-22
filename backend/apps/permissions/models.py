"""
permissions app - 权限管理模块
菜单、角色、权限分配、操作日志
"""
from django.conf import settings
from django.db import models


class Role(models.Model):
    name = models.CharField(max_length=50, verbose_name="角色名称")
    code = models.CharField(max_length=50, unique=True, null=True, verbose_name="角色代码")
    description = models.TextField(blank=True, verbose_name="描述")
    is_system = models.BooleanField(default=False, verbose_name="系统预设角色")
    data_scope = models.CharField(
        max_length=20,
        default="all",
        choices=[
            ("all", "全部数据"),
            ("city", "本城市数据"),
            ("department", "本部门数据"),
            ("self", "仅自己创建的数据"),
        ],
        verbose_name="数据范围",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "perm_roles"
        verbose_name = "角色"
        verbose_name_plural = verbose_name
        ordering = ["id"]

    def __str__(self):
        return self.name


class Menu(models.Model):
    name = models.CharField(max_length=50, verbose_name="菜单名称")
    code = models.CharField(max_length=50, unique=True, verbose_name="菜单编码")
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, verbose_name="父菜单"
    )
    path = models.CharField(max_length=200, blank=True, verbose_name="路由路径")
    icon = models.CharField(max_length=50, blank=True, verbose_name="图标")
    sort_order = models.IntegerField(default=0, verbose_name="排序")
    menu_type = models.CharField(
        max_length=10,
        default="menu",
        choices=[("menu", "菜单"), ("button", "按钮")],
    )
    is_visible = models.BooleanField(default=True, verbose_name="是否显示")

    class Meta:
        db_table = "perm_menus"
        verbose_name = "菜单"
        verbose_name_plural = verbose_name
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class RoleMenuPermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="menu_permissions",
        verbose_name="角色",
    )
    menu = models.ForeignKey(
        Menu,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        verbose_name="菜单",
    )

    class Meta:
        db_table = "perm_role_menu_permissions"
        verbose_name = "角色菜单权限"
        verbose_name_plural = verbose_name
        unique_together = ("role", "menu")

    def __str__(self):
        return f"{self.role.name} - {self.menu.name}"


class RoleFieldPermission(models.Model):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="field_permissions",
        verbose_name="角色",
    )
    app_label = models.CharField(max_length=50, verbose_name="应用标识")
    model_name = models.CharField(max_length=50, verbose_name="模型名称")
    field_name = models.CharField(max_length=50, verbose_name="字段名称")
    visible = models.BooleanField(default=True, verbose_name="是否可见")

    class Meta:
        db_table = "perm_role_field_permissions"
        verbose_name = "角色字段权限"
        verbose_name_plural = verbose_name
        unique_together = ("role", "app_label", "model_name", "field_name")

    def __str__(self):
        return (
            f"{self.role.name} - {self.app_label}.{self.model_name}.{self.field_name}"
        )


class PermissionLog(models.Model):
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="操作人",
    )
    action = models.CharField(max_length=50, verbose_name="操作类型")
    target = models.CharField(max_length=200, blank=True, verbose_name="操作对象")
    detail = models.JSONField(default=dict, verbose_name="变更详情")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "perm_permission_logs"
        verbose_name = "权限操作日志"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} - {self.target} ({self.created_at})"


# 多对多: Role <-> User (成员关联)
class RoleMember(models.Model):
    role = models.ForeignKey(
        Role, on_delete=models.CASCADE, related_name="members", verbose_name="角色"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perm_roles",
        verbose_name="用户",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "perm_role_members"
        verbose_name = "角色成员"
        verbose_name_plural = verbose_name
        unique_together = ("role", "user")

    def __str__(self):
        return f"{self.role.name} - {self.user.username}"
