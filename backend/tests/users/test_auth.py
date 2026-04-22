# -*- coding: utf-8 -*-

"""
用户认证模块测试
测试用户注册、登录、Token获取等核心功能
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import UserProfile

User = get_user_model()


@pytest.mark.django_db
class TestUserAuthentication:
    """用户认证测试类"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def user_data(self):
        """测试用户数据"""
        return {
            "phone": "13800138000",
            "password": "Test123456",
            "real_name": "测试用户",
        }

    @pytest.fixture
    def create_user(self, user_data):
        """创建测试用户并确保 profile 为 active 状态"""
        user = User.objects.create_user(
            phone=user_data["phone"],
            password=user_data["password"],
            real_name=user_data["real_name"],
            identity="customer",
        )
        # 确保有 active 的 profile（登录需要）
        UserProfile.objects.get_or_create(
            user=user,
            defaults={
                "user_type": "decoration",
                "status": "active",
            },
        )
        yield user
        user.delete()

    def test_user_registration_decoration(self, api_client):
        """测试装企用户注册"""
        response = api_client.post(
            "/api/v1/users/register/decoration/",
            data={
                "phone": "13900139000",
                "password": "Test123456",
                "contact_name": "装企注册用户",
            },
        )
        assert (
            response.status_code == 201
        ), f"装企注册失败: {response.status_code} - {response.data}"
        assert "token" in response.data, f"注册响应缺少token: {response.data.keys()}"
        token = response.data["token"]
        assert "access" in token
        assert "refresh" in token

    def test_user_registration_staff(self, api_client):
        """测试管理人员注册（待审核）"""
        response = api_client.post(
            "/api/v1/users/register/staff/",
            data={
                "phone": "13900139001",
                "password": "Test123456",
                "real_name": "管理人员注册",
                "user_type": "management",
            },
        )
        assert (
            response.status_code == 201
        ), f"注册失败: {response.status_code} - {response.data}"
        assert "message" in response.data
        # 管理人员注册需审核
        user = User.objects.get(phone="13900139001")
        profile = user.profile
        assert profile.status == "pending", f"管理人员注册后应为pending状态，实际: {profile.status}"

    def test_user_registration_duplicate_phone(self, api_client, create_user):
        """测试重复手机号注册"""
        response = api_client.post(
            "/api/v1/users/register/decoration/",
            data={
                "phone": "13800138000",  # 已注册
                "password": "Test123456",
                "contact_name": "重复注册",
            },
        )
        assert response.status_code == 400, f"重复手机号应返回400，实际: {response.status_code}"

    def test_user_registration_invalid_input(self, api_client):
        """测试注册参数校验"""
        # 缺少手机号
        response = api_client.post(
            "/api/v1/users/register/decoration/",
            data={
                "password": "Test123456",
            },
        )
        assert response.status_code == 400

        # 密码太短
        response = api_client.post(
            "/api/v1/users/register/decoration/",
            data={
                "phone": "13900139002",
                "password": "123",
            },
        )
        assert response.status_code == 400

    def test_user_login(self, api_client, create_user, user_data):
        """测试用户登录获取Token"""
        response = api_client.post(
            "/api/v1/users/login/",
            data={"username": user_data["phone"], "password": user_data["password"]},
        )

        assert (
            response.status_code == 200
        ), f"登录失败: {response.status_code} - {response.data}"

        data = response.data
        assert "token" in data, f"返回数据中缺少token字段: {data.keys()}"
        assert "refresh" in data, f"返回数据中缺少refresh字段: {data.keys()}"
        assert "user" in data, f"返回数据中缺少user字段: {data.keys()}"
        assert "expires_in" in data, f"返回数据中缺少expires_in字段: {data.keys()}"

    def test_token_refresh(self, api_client, create_user):
        """测试Token刷新 - 使用 simplejwt 的 RefreshToken 直接验证"""
        refresh = RefreshToken.for_user(create_user)
        original_access = str(refresh.access_token)

        # 验证 access token 可以解码
        import jwt

        payload = jwt.decode(original_access, options={"verify_signature": False})
        assert "user_id" in payload, "access token 应包含 user_id"

        # 验证 refresh token 可以生成新的 access token
        new_access = str(refresh.access_token)
        new_payload = jwt.decode(new_access, options={"verify_signature": False})
        assert int(new_payload["user_id"]) == create_user.id

    def test_protected_endpoint_access(self, api_client, create_user):
        """测试受保护端点访问"""
        # 未认证访问应失败
        response = api_client.get("/api/v1/users/me/")
        assert response.status_code in [
            401,
            403,
        ], f"未认证访问应失败，实际状态码: {response.status_code}"

        # 认证后访问应成功
        refresh = RefreshToken.for_user(create_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/users/me/")
        assert response.status_code == 200, f"认证后访问应成功，实际状态码: {response.status_code}"

    def test_invalid_login(self, api_client, create_user):
        """测试无效登录凭据"""
        # 测试不存在的用户
        response = api_client.post(
            "/api/v1/users/login/",
            data={"username": "99999999999", "password": "wrongpassword"},
        )
        assert response.status_code == 400, f"不存在的用户登录应返回400，实际: {response.status_code}"

        # 测试错误密码
        response = api_client.post(
            "/api/v1/users/login/",
            data={"username": "13800138000", "password": "wrongpassword"},
        )
        assert response.status_code == 400, f"错误密码登录应返回400，实际: {response.status_code}"

    def test_login_pending_user_rejected(self, api_client):
        """测试待审核用户登录"""
        # 创建待审核用户
        user = User.objects.create_user(
            phone="13800138888",
            password="Test123456",
            real_name="待审核用户",
            identity="decoration",
        )
        UserProfile.objects.create(
            user=user,
            user_type="management",
            status="pending",
        )

        response = api_client.post(
            "/api/v1/users/login/",
            data={"username": "13800138888", "password": "Test123456"},
        )
        # 非customer用户待审核时，登录应被拒绝（或返回is_approved=false）
        assert (
            response.status_code == 403
        ), f"待审核的非customer用户登录应返回403，实际: {response.status_code}"

        user.delete()
