# -*- coding: utf-8 -*-

"""
users app - 用户认证与权限管理
按需求文档重构：10个角色、分公司、产品线
"""
from django.conf import settings
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models

from common.enums import ProductLine, UserIdentity, UserStatus
from common.validators import phone_validator


class UserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("手机号必填")
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("identity", UserIdentity.DECORATION)
        extra_fields.setdefault("status", UserStatus.ACTIVE)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(phone, password, **extra_fields)


class Branch(models.Model):
    """分公司"""

    name = models.CharField("分公司名称", max_length=100, unique=True)
    city = models.CharField("城市", max_length=50, blank=True, default="")
    address = models.CharField("地址", max_length=500, blank=True, default="")
    is_active = models.BooleanField("是否启用", default=True)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "branches"
        verbose_name = "分公司"
        verbose_name_plural = verbose_name
        ordering = ["name"]

    def __str__(self):
        return self.name


class User(AbstractBaseUser, PermissionsMixin):
    """用户主表"""

    phone = models.CharField(
        "手机号", max_length=20, unique=True, validators=[phone_validator]
    )
    real_name = models.CharField("真实姓名", max_length=50, blank=True, default="")
    wechat_open_id = models.CharField(
        "微信OpenID", max_length=128, unique=True, null=True, blank=True, default=None
    )
    wechat_union_id = models.CharField(
        "微信UnionID", max_length=128, null=True, blank=True, default=None
    )
    avatar = models.CharField("头像URL", max_length=500, blank=True, default="")

    # 身份与组织
    identity = models.CharField(
        "身份",
        max_length=20,
        choices=UserIdentity.CHOICES,
        default=UserIdentity.CONTRACTOR,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="分公司",
    )
    city = models.CharField("城市", max_length=50, blank=True, default="")
    product_line = models.CharField(
        "文员产品线", max_length=20, choices=ProductLine.CHOICES, blank=True, default=""
    )

    # 状态
    status = models.CharField(
        "状态", max_length=20, choices=UserStatus.CHOICES, default=UserStatus.ACTIVE
    )
    is_staff = models.BooleanField("员工", default=False)
    is_active = models.BooleanField("激活", default=True)
    last_login_at = models.DateTimeField("最后登录时间", null=True, blank=True)

    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "用户"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return self.real_name or self.phone or f"User#{self.id}"


class UserProfile(models.Model):
    """用户扩展档案 - 装企关联、注册审核等"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    user_type = models.CharField(
        "用户类型",
        max_length=20,
        choices=[
            ("decoration", "装企人员"),
            ("management", "管理人员"),
            ("service", "服务人员"),
            ("admin", "系统管理员"),
        ],
        default="decoration",
    )
    brand = models.ForeignKey(
        "decoration.Brand",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="装企品牌",
    )
    store = models.ForeignKey(
        "decoration.Store",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="装企门店",
    )
    department = models.CharField("所属部门", max_length=50, blank=True, default="")
    role = models.ForeignKey(
        "permissions.Role",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="角色",
    )
    status = models.CharField(
        "状态",
        max_length=20,
        default="active",
        choices=[
            ("active", "正常"),
            ("pending", "待审核"),
            ("rejected", "已驳回"),
            ("disabled", "已禁用"),
        ],
    )
    reject_reason = models.TextField("驳回原因", blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = "用户档案"
        verbose_name_plural = verbose_name

    def __str__(self):
        return (
            f"{self.user.real_name or self.user.phone} - {self.get_user_type_display()}"
        )


class UserRole(models.Model):
    """角色表 - 已废弃，改用 permissions.Role"""

    name = models.CharField("角色名称", max_length=50, unique=True)
    code = models.CharField("角色代码", max_length=50, unique=True)
    description = models.TextField("描述", blank=True, default="")
    permissions = models.JSONField("权限配置", default=dict, blank=True)
    is_system = models.BooleanField("是否系统内置", default=False)
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "roles"
        verbose_name = "角色(已废弃)"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class Permission(models.Model):
    """权限表"""

    code = models.CharField("权限代码", max_length=100, unique=True)
    name = models.CharField("权限名称", max_length=100)
    description = models.TextField("描述", blank=True, default="")
    resource = models.CharField("资源类型", max_length=50, blank=True, default="")
    action = models.CharField("操作类型", max_length=50, blank=True, default="")
    created_at = models.DateTimeField("创建时间", auto_now_add=True)
    updated_at = models.DateTimeField("更新时间", auto_now=True)

    class Meta:
        db_table = "permissions"
        verbose_name = "权限"
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name
