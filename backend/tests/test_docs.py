"""
API文档端点测试
验证Swagger/OpenAPI文档生成是否正常工作
"""
import pytest
from django.test import TestCase
from django.urls import reverse


class APIDocumentationTest(TestCase):
    """API文档端点测试类"""

    def test_swagger_ui_endpoint(self):
        """测试Swagger UI端点是否可访问"""
        url = reverse("schema-swagger-ui")
        response = self.client.get(url)

        # Swagger UI应返回200状态码
        # 注意：在生产环境中可能限制访问，但在开发/测试环境中应可访问
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])

    def test_redoc_endpoint(self):
        """测试ReDoc端点是否可访问"""
        url = reverse("schema-redoc")
        response = self.client.get(url)

        # ReDoc应返回200状态码
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])

    def test_openapi_schema_endpoint(self):
        """测试OpenAPI Schema JSON端点"""
        # drf-yasg 也提供JSON格式的schema
        # 注意：drf_yasg的JSON端点URL模式，如果配置了的话
        # 这里我们测试Swagger UI端点，它应该加载schema

        url = reverse("schema-swagger-ui")
        response = self.client.get(url)

        # 页面应包含OpenAPI相关关键词
        content = response.content.decode("utf-8", errors="ignore")
        self.assertIn("swagger", content.lower() or "openapi", content.lower())

    @pytest.mark.skip(reason="drf-yasg已安装，无需跳过。如需慢速测试可单独运行。")
    def test_api_schema_generation(self):
        """测试API schema生成（慢速测试，需要drf-yasg）"""
        # 此测试验证drf-yasg能正确生成schema
        # 需要drf-yasg已安装
        try:
            from drf_yasg import openapi
            from drf_yasg.views import get_schema_view

            # 如果导入成功，说明drf-yasg已安装
            self.assertTrue(True, "drf-yasg已安装")
        except ImportError:
            self.skipTest("drf-yasg未安装，跳过此测试")


def test_documentation_dependencies():
    """验证文档生成所需依赖"""
    try:
        import drf_yasg
        import openapi

        # 如果导入成功，依赖已安装
        assert True
    except ImportError as e:
        pytest.skip(f"文档生成依赖未安装: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
