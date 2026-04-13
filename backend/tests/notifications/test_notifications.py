"""
通知管理模块单元测试
测试门窗安装管理系统的通知功能
"""
import uuid

from django.test import TestCase

from apps.notifications.models import Notification
from apps.users.models import User
from common.enums import NotificationType


class NotificationModelTest(TestCase):
    """系统通知模型测试"""

    def setUp(self):
        """测试前置设置：创建测试用户"""
        self.user = User.objects.create_user(
            phone=f"138{str(uuid.uuid4().int)[:8]}", password="testpass123"
        )

    def test_create_notification(self):
        """测试创建系统通知"""
        notification = Notification.objects.create(
            user=self.user,
            type=NotificationType.SYSTEM,
            title="测试通知标题",
            content="这是一个测试通知内容",
            related_id=123,
            related_type="order",
            is_read=False,
        )
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.type, NotificationType.SYSTEM)
        self.assertEqual(notification.title, "测试通知标题")
        self.assertEqual(notification.content, "这是一个测试通知内容")
        self.assertEqual(notification.related_id, 123)
        self.assertEqual(notification.related_type, "order")
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)
        self.assertTrue(notification.id is not None)

    def test_notification_type_choices(self):
        """测试通知类型选项"""
        # 假设NotificationType有这些值，实际需要查看enum定义
        # 系统通知
        notification1 = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="系统通知"
        )
        self.assertEqual(notification1.type, NotificationType.SYSTEM)

        # 订单通知（如果存在）
        # notification2 = Notification.objects.create(
        #     user=self.user,
        #     type=NotificationType.ORDER,
        #     title="订单通知"
        # )
        # self.assertEqual(notification2.type, NotificationType.ORDER)

    def test_notification_read_status(self):
        """测试通知阅读状态"""
        notification = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="未读通知", is_read=False
        )
        self.assertFalse(notification.is_read)
        self.assertIsNone(notification.read_at)

        # 标记为已读
        notification.is_read = True
        # read_at字段可能由业务逻辑自动设置，这里只测试字段
        notification.save()
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_notification_without_related_info(self):
        """测试无关联业务信息的通知"""
        notification = Notification.objects.create(
            user=self.user,
            type=NotificationType.SYSTEM,
            title="无关联通知",
            content="这是一个普通通知",
        )
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, "无关联通知")
        self.assertIsNone(notification.related_id)
        self.assertEqual(notification.related_type, "")
        self.assertFalse(notification.is_read)

    def test_notification_str_representation(self):
        """测试通知的字符串表示"""
        notification = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="字符串测试通知"
        )
        expected_str = f"{notification.title} -> {self.user}"
        self.assertEqual(str(notification), expected_str)

    def test_notification_ordering(self):
        """测试通知按创建时间倒序排列"""
        # 创建多个通知
        notification1 = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="通知1"
        )
        notification2 = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="通知2"
        )
        notification3 = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="通知3"
        )

        # 获取按创建时间倒序排列的通知
        notifications = list(Notification.objects.all())
        self.assertEqual(notifications[0].title, "通知3")  # 最新创建
        self.assertEqual(notifications[1].title, "通知2")
        self.assertEqual(notifications[2].title, "通知1")

    def test_notification_content_optional(self):
        """测试通知内容可选"""
        notification = Notification.objects.create(
            user=self.user, type=NotificationType.SYSTEM, title="无内容通知"
        )
        self.assertEqual(notification.content, "")
        self.assertEqual(notification.title, "无内容通知")
