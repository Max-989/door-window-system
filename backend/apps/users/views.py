# -*- coding: utf-8 -*-

"""
users app - 视图
"""

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.permissions.models import Role as PermRole
from common import responses
from common.pagination import StandardPagination

from .models import Branch, Permission, User, UserProfile, UserRole
from .serializers import (
    BranchListSerializer,
    BranchSerializer,
    PendingUserSerializer,
    PermissionSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserRoleSerializer,
    UserUpdateSerializer,
)

UserModel = get_user_model()


def _generate_token(user):
    """生成JWT token"""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ==================== 注册视图 ====================


@api_view(["POST"])
@permission_classes([AllowAny])
def register_decoration(request):
    """装企注册 - 直接生效"""
    data = request.data

    # 严格校验必填字段
    phone = data.get("phone")
    password = data.get("password")

    if not phone or not isinstance(phone, str) or not phone.strip():
        return responses.error(message="手机号必填", code=http_status.HTTP_400_BAD_REQUEST)

    if not password or not isinstance(password, str) or len(password) < 6:
        return responses.error(
            message="密码必填且至少6位", code=http_status.HTTP_400_BAD_REQUEST
        )

    phone = phone.strip()

    # 校验可选字段类型
    brand_id = data.get("brand_id")
    store_id = data.get("store_id")
    role_id = data.get("role_id")

    if brand_id is not None:
        try:
            brand_id = int(brand_id)
        except (TypeError, ValueError):
            return responses.error(
                message="brand_id 必须为整数", code=http_status.HTTP_400_BAD_REQUEST
            )

    if store_id is not None:
        try:
            store_id = int(store_id)
        except (TypeError, ValueError):
            return responses.error(
                message="store_id 必须为整数", code=http_status.HTTP_400_BAD_REQUEST
            )

    if role_id is not None:
        try:
            role_id = int(role_id)
        except (TypeError, ValueError):
            return responses.error(
                message="role_id 必须为整数", code=http_status.HTTP_400_BAD_REQUEST
            )

    contact_name = data.get("contact_name", "")
    if contact_name is None:
        contact_name = ""

    # 验证码：任意4位数字都通过
    # captcha = request.data.get('captcha', '')

    if User.objects.filter(phone=phone).exists():
        return responses.error(message="该手机号已注册", code=http_status.HTTP_400_BAD_REQUEST)

    # 创建 User
    user = User.objects.create_user(
        phone=phone, password=password, real_name=contact_name, identity="decoration"
    )

    # 创建 UserProfile
    profile = UserProfile.objects.create(
        user=user,
        user_type="decoration",
        status="active",
    )
    if brand_id:
        from apps.decoration.models import Brand

        try:
            profile.brand = Brand.objects.get(id=brand_id)
        except Brand.DoesNotExist:
            pass
    if store_id:
        from apps.decoration.models import Store

        try:
            profile.store = Store.objects.get(id=store_id)
        except Store.DoesNotExist:
            pass
    if role_id:
        try:
            profile.role = PermRole.objects.get(id=role_id)
        except PermRole.DoesNotExist:
            pass
    profile.save()

    token = _generate_token(user)
    return responses.created(data={"token": token}, message="注册成功")


@api_view(["POST"])
@permission_classes([AllowAny])
def register_staff(request):
    """管理人员/服务人员注册 - 待审核"""
    real_name = request.data.get("real_name", "")
    phone = request.data.get("phone", "")
    password = request.data.get("password", "")
    user_type = request.data.get("user_type", "management")

    if not phone or not password:
        return responses.error(
            message="手机号和密码必填", code=http_status.HTTP_400_BAD_REQUEST
        )

    if user_type not in ("management", "service"):
        return responses.error(message="用户类型无效", code=http_status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(phone=phone).exists():
        return responses.error(message="该手机号已注册", code=http_status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        phone=phone, password=password, real_name=real_name, identity="contractor"
    )

    UserProfile.objects.create(
        user=user,
        user_type=user_type,
        status="pending",
    )

    return responses.created(data=None, message="注册成功，请等待管理员审核")


# ==================== 登录视图 ====================


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """登录 - 支持手机号登录"""
    username = request.data.get("username", "")
    password = request.data.get("password", "")

    # 支持手机号登录
    user = User.objects.filter(phone=username).first() if username else None

    if not user or not user.check_password(password):
        return responses.error(message="账号或密码错误", code=400)

    # 检查 UserProfile 状态
    try:
        profile = user.profile
        if profile.status == "rejected":
            return responses.error(message="注册申请已被驳回", code=403)
        if profile.status == "pending":
            return responses.error(message="注册申请待审核", code=403)
        if profile.status == "disabled":
            return responses.error(message="账号已被禁用", code=403)
    except UserProfile.DoesNotExist:
        pass

    if not user.is_active:
        return responses.error(message="账号已被禁用", code=403)

    token = _generate_token(user)

    # 获取 identity 和 is_approved
    identity = user.identity
    is_approved = True  # 默认通过

    # 获取 profile 信息，判断审核状态
    profile = None
    try:
        profile = user.profile
        if profile.status == "rejected":
            return responses.error(message="注册申请已被驳回", code=403)
        if profile.status == "disabled":
            return responses.error(message="账号已被禁用", code=403)
        if profile.status == "pending":
            # 乙方待审核：允许登录但标记 is_approved=false
            if identity != "customer":
                is_approved = False
            # 客户自动通过
        is_approved = profile.status == "active"
    except UserProfile.DoesNotExist:
        pass

    # 获取主 role（从 permissions.Role 通过 RoleMember 关联）
    role_code = None
    if profile and profile.role:
        role_code = profile.role.name  # UserProfile.role FK
    else:
        # 从 RoleMember 多对多获取
        role_member = user.perm_roles.select_related("role").first()
        if role_member:
            role_code = role_member.role.name

    user_data = {
        "id": user.id,
        "phone": user.phone,
        "name": user.real_name or user.phone,
        "identity": identity,
        "role": role_code,
        "is_approved": is_approved,
    }

    return responses.success(
        data={
            "token": token["access"],
            "refresh": token["refresh"],
            "user": user_data,
            "expires_in": 900,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh_view(request):
    """刷新 access token - 使用 SimpleJWT TokenRefreshView"""
    from rest_framework_simplejwt.views import TokenRefreshView

    view = TokenRefreshView.as_view()
    response = view(request)

    if response.status_code != 200:
        detail = response.data.get("detail", "刷新失败")
        return responses.error(message=detail, code=response.status_code)

    return responses.success(data=response.data)


@api_view(["GET"])
def me_view(request):
    """获取当前用户信息"""
    user = request.user

    identity = user.identity
    is_approved = True
    role_code = None

    try:
        profile = user.profile
        is_approved = profile.status == "active"
        if profile.role:
            role_code = profile.role.name
    except UserProfile.DoesNotExist:
        pass

    if not role_code:
        role_member = user.perm_roles.select_related("role").first()
        if role_member:
            role_code = role_member.role.name

    return Response(
        {
            "id": user.id,
            "phone": user.phone,
            "name": user.real_name or user.phone,
            "identity": identity,
            "role": role_code,
            "is_approved": is_approved,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_password(request):
    """重置密码 - 仅限修改自己的密码"""
    phone = request.data.get("phone", "")
    old_password = request.data.get("old_password", "")
    new_password = request.data.get("new_password", "")

    if not old_password:
        return Response({"detail": "原密码不能为空"}, status=http_status.HTTP_400_BAD_REQUEST)
    if not new_password:
        return Response({"detail": "新密码不能为空"}, status=http_status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 6:
        return Response({"detail": "密码至少6位"}, status=http_status.HTTP_400_BAD_REQUEST)

    # 验证原密码
    if not request.user.check_password(old_password):
        return Response({"detail": "原密码错误"}, status=http_status.HTTP_400_BAD_REQUEST)

    # 只能重置自己的密码
    if phone and phone != request.user.phone:
        return Response({"detail": "只能重置自己的密码"}, status=http_status.HTTP_403_FORBIDDEN)

    request.user.set_password(new_password)
    request.user.save()
    return Response({"detail": "密码重置成功"})


@api_view(["POST"])
@permission_classes([IsAdminUser])
def confirm_role(request):
    """确认角色选择（仅管理员）"""
    phone = request.data.get("phone", "")
    role_id = request.data.get("role_id")

    if not phone or not role_id:
        return Response(
            {"detail": "手机号和角色ID必填"}, status=http_status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response({"detail": "用户不存在"}, status=http_status.HTTP_404_NOT_FOUND)

    try:
        profile = user.profile
        profile.role = PermRole.objects.get(id=role_id)
        profile.save()
        return Response({"detail": "角色确认成功"})
    except UserProfile.DoesNotExist:
        return Response({"detail": "用户档案不存在"}, status=http_status.HTTP_404_NOT_FOUND)
    except PermRole.DoesNotExist:
        return Response({"detail": "角色不存在"}, status=http_status.HTTP_400_BAD_REQUEST)


# ==================== 审核视图 ====================


class PendingUserViewSet(viewsets.GenericViewSet):
    """待审核用户管理"""

    permission_classes = [IsAdminUser]
    pagination_class = StandardPagination

    def list(self, request):
        """获取待审核用户列表"""
        profiles = (
            UserProfile.objects.filter(status="pending")
            .select_related("user", "brand", "store", "role")
            .order_by("-created_at")
        )

        page = self.paginate_queryset(profiles)
        if page is not None:
            serializer = PendingUserSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PendingUserSerializer(profiles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """审核通过"""
        profile = get_object_or_404(UserProfile, pk=pk, status="pending")
        role_id = request.data.get("role_id")
        department = request.data.get("department", "")

        profile.status = "active"
        if department:
            profile.department = department
        if role_id:
            try:
                profile.role = PermRole.objects.get(id=role_id)
            except PermRole.DoesNotExist:
                return Response(
                    {"error": "角色不存在"}, status=http_status.HTTP_400_BAD_REQUEST
                )
        profile.save()

        return Response({"message": "审核通过"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """审核驳回"""
        profile = get_object_or_404(UserProfile, pk=pk, status="pending")
        reason = request.data.get("reason", "")

        profile.status = "rejected"
        profile.reject_reason = reason
        profile.save()

        return Response({"message": "已驳回"})


# ==================== 原有视图 ====================


class BranchViewSet(viewsets.ModelViewSet):
    """分公司管理"""

    queryset = Branch.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "city"]
    ordering_fields = ["name", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return BranchListSerializer
        return BranchSerializer


class UserViewSet(viewsets.ModelViewSet):
    """用户管理"""

    queryset = User.objects.select_related("branch").all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["identity", "branch", "city", "product_line", "status"]
    search_fields = ["phone", "real_name"]
    ordering_fields = ["created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        elif self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserDetailSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)


class UserRoleViewSet(viewsets.ModelViewSet):
    """角色管理（已废弃，使用 permissions.Role）"""

    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "code"]


class PermissionViewSet(viewsets.ModelViewSet):
    """权限管理"""

    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "code", "resource"]
