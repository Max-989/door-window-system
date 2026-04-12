"""
健康检查端点测试
"""
from unittest.mock import MagicMock, patch

from django.test import Client, TestCase


class HealthCheckTest(TestCase):
    """健康检查端点测试"""

    def setUp(self):
        self.client = Client()

    def test_ping_endpoint(self):
        """测试ping端点"""
        response = self.client.get("/api/ping/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "message": "pong"})

    def test_health_check_endpoint_exists(self):
        """测试健康检查端点存在"""
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("timestamp", data)
        self.assertIn("components", data)

    @patch("common.health.connection")
    def test_health_check_database_failure(self, mock_connection):
        """测试数据库连接失败的情况"""
        mock_cursor = MagicMock()
        mock_cursor.execute.side_effect = Exception("Database connection failed")
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 503)  # 服务不可用
        data = response.json()
        self.assertEqual(data["status"], "unhealthy")
        self.assertEqual(data["components"]["database"]["status"], "unhealthy")

    @patch("common.health.cache")
    def test_health_check_redis_failure(self, mock_cache):
        """测试Redis连接失败的情况"""
        mock_cache.set.side_effect = Exception("Redis connection failed")

        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 503)
        data = response.json()
        self.assertEqual(data["status"], "unhealthy")
        self.assertEqual(data["components"]["redis"]["status"], "unhealthy")
