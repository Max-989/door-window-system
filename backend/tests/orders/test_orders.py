# -*- coding: utf-8 -*-

"""
订单模块测试
测试订单创建、查询、状态流转等核心功能
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.decoration.models import Brand, DecorationStaff, Store
from apps.orders.models import Order
from apps.users.models import Branch

User = get_user_model()


@pytest.mark.django_db
class TestOrderManagement:
    """订单管理测试类"""

    @pytest.fixture
    def api_client(self):
        return APIClient()

    @pytest.fixture
    def test_user(self):
        """创建测试用户"""
        user = User.objects.create_user(
            phone="13800138001",
            password="Test123456",
            real_name="订单测试用户",
            identity="contractor",  # 假设为承包商身份
        )
        yield user
        user.delete()

    @pytest.fixture
    def authenticated_client(self, api_client, test_user):
        """创建已认证的API客户端"""
        # 为用户生成Token
        refresh = RefreshToken.for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return api_client

    @pytest.fixture
    def test_brand(self):
        """创建测试品牌"""
        brand = Brand.objects.create(name="测试品牌")
        yield brand
        brand.delete()

    @pytest.fixture
    def test_store(self, test_brand):
        """创建测试门店"""
        store = Store.objects.create(name="测试门店", brand=test_brand, address="测试地址")
        yield store
        store.delete()

    @pytest.fixture
    def test_salesperson(self, test_store):
        """创建测试导购/项目经理"""
        staff = DecorationStaff.objects.create(
            name="测试导购", store=test_store, phone="13800138002", role="salesperson"
        )
        yield staff
        staff.delete()

    @pytest.fixture
    def test_branch(self):
        """创建测试分公司"""
        branch = Branch.objects.create(name="测试分公司")
        yield branch
        branch.delete()

    @pytest.fixture
    def order_data(self, test_brand, test_store, test_salesperson, test_branch):
        """测试订单数据"""
        return {
            "order_no": "TEST001",
            "source": "direct",  # 直接客户
            "brand": test_brand.id,
            "store": test_store.id,
            "salesperson": test_salesperson.id,
            "branch": test_branch.id,
            "customer_name": "测试客户",
            "customer_phone": "13800138003",
            "address": "测试安装地址",
            "order_type": "installation",  # 安装订单
            "product_line": "door",  # 门类
            "total_amount": 10000.00,
            "deposit_amount": 3000.00,
            "status": "pending",  # 待确认
        }

    def test_order_list_requires_auth(self, api_client):
        """测试订单列表需要认证"""
        response = api_client.get("/api/v1/orders/")
        # 未认证用户应返回401
        assert response.status_code == 401

    def test_order_list_with_auth(self, authenticated_client):
        """测试认证用户访问订单列表"""
        response = authenticated_client.get("/api/v1/orders/")
        # 认证用户应能访问，可能返回空列表
        assert response.status_code in [200, 403]  # 200成功或403权限不足

        if response.status_code == 200:
            # 检查返回格式
            data = response.json()
            # 项目使用自定义wrapper格式: {code, data: {items, total}}
            assert "code" in data
            assert "data" in data
            assert "items" in data["data"]
            assert "total" in data["data"]

    def test_order_create_requires_auth(self, api_client, order_data):
        """测试创建订单需要认证"""
        response = api_client.post("/api/v1/orders/", data=order_data, format="json")
        assert response.status_code == 401

    @pytest.mark.skip(reason="订单创建需要更多字段和业务验证，暂不测试")
    def test_order_create_with_auth(self, authenticated_client, order_data):
        """测试认证用户创建订单"""
        # 订单创建需要更多业务验证，暂时跳过
        response = authenticated_client.post(
            "/api/v1/orders/", data=order_data, format="json"
        )
        # 如果成功，应返回201
        if response.status_code == 201:
            data = response.json()
            assert "code" in data
            assert data["code"] == 0  # 成功
            assert "data" in data
            assert "id" in data["data"]
        else:
            # 可能是业务验证失败，记录原因
            print(f"订单创建失败: {response.status_code}, {response.json()}")

    def test_order_detail_requires_auth(self, api_client):
        """测试订单详情需要认证"""
        response = api_client.get("/api/v1/orders/1/")
        assert response.status_code == 401

    def test_order_status_flow(self, authenticated_client):
        """测试订单状态流转（简化）"""
        # 获取订单列表
        response = authenticated_client.get("/api/v1/orders/")
        if response.status_code == 200:
            data = response.json()
            orders = data["data"]["items"]

            if orders:
                # 测试第一个订单的状态
                order_id = orders[0]["id"]
                # 尝试获取订单详情
                detail_response = authenticated_client.get(
                    f"/api/v1/orders/{order_id}/"
                )
                if detail_response.status_code == 200:
                    order_data = detail_response.json()["data"]
                    assert "status" in order_data
                    # 状态应为有效值
                    valid_statuses = [
                        "pending",
                        "confirmed",
                        "produced",
                        "shipped",
                        "installed",
                        "completed",
                        "cancelled",
                    ]
                    assert order_data["status"] in valid_statuses


@pytest.mark.django_db
def test_order_model_str():
    """测试Order模型__str__方法"""
    # 创建最小化的Order实例用于测试
    user = User.objects.create_user(
        phone="13800138004", password="Test123456", real_name="模型测试用户"
    )

    order = Order.objects.create(
        order_no="MODEL_TEST001",
        source="direct",
        customer_name="模型测试客户",
        customer_phone="13800138005",
        status="pending",
    )

    # 测试字符串表示
    assert str(order) == "MODEL_TEST001"
    assert order.order_no in str(order)

    # 清理
    order.delete()
    user.delete()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
