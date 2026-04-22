# -*- coding: utf-8 -*-

"""
安装管理模块单元测试
测试门窗安装管理系统的安装任务功能
"""
import uuid

from django.test import TestCase

from apps.installations.models import InstallationTask
from common.enums import InstallationStatus, OrderSource


class InstallationTaskModelTest(TestCase):
    """安装任务模型测试"""

    def test_create_installation_task(self):
        """测试创建安装任务（基本字段）"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            customer_name="测试客户",
            customer_phone="13800138000",
            customer_address="测试地址123号",
            door_types=["木门", "合金门"],
            door_quantity=3,
            status=InstallationStatus.PENDING,
        )
        self.assertEqual(task.task_no, task_no)
        self.assertEqual(task.source, OrderSource.BRAND_STORE)
        self.assertEqual(task.customer_name, "测试客户")
        self.assertEqual(task.customer_phone, "13800138000")
        self.assertEqual(task.door_quantity, 3)
        self.assertEqual(task.status, InstallationStatus.PENDING)
        self.assertEqual(list(task.door_types), ["木门", "合金门"])
        self.assertTrue(task.id is not None)

    def test_installation_task_status_flow(self):
        """测试安装任务状态流转"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT_INSTALLATION,
            customer_name="状态测试客户",
            door_quantity=2,
            status=InstallationStatus.PENDING,
        )
        # 初始状态为PENDING
        self.assertEqual(task.status, InstallationStatus.PENDING)

        # 模拟状态变更（实际业务中可能有状态机约束）
        task.status = InstallationStatus.ASSIGNED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, InstallationStatus.ASSIGNED)

        task.status = InstallationStatus.IN_PROGRESS
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, InstallationStatus.IN_PROGRESS)

        task.status = InstallationStatus.COMPLETED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, InstallationStatus.COMPLETED)

    def test_installation_task_without_customer_info(self):
        """测试无客户信息的安装任务（关联订单的情况）"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            door_quantity=0,
            status=InstallationStatus.PENDING,
        )
        # 客户信息可为空
        self.assertEqual(task.customer_name, "")
        self.assertEqual(task.customer_phone, "")
        self.assertEqual(task.customer_address, "")

    def test_installation_task_door_types_json(self):
        """测试门种类的JSON字段"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"

        # 测试空列表
        task1 = InstallationTask.objects.create(
            task_no=task_no + "1",
            source=OrderSource.DIRECT_INSTALLATION,
            door_types=[],
            door_quantity=0,
        )
        self.assertEqual(list(task1.door_types), [])

        # 测试多个门类型
        task2 = InstallationTask.objects.create(
            task_no=task_no + "2",
            source=OrderSource.DIRECT_INSTALLATION,
            door_types=["木门", "合金门", "防盗门"],
            door_quantity=3,
        )
        self.assertEqual(list(task2.door_types), ["木门", "合金门", "防盗门"])

    def test_installation_task_size_list(self):
        """测试尺寸单JSON字段"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        size_data = [
            {"type": "木门", "width": 800, "height": 2000, "quantity": 2},
            {"type": "合金门", "width": 900, "height": 2100, "quantity": 1},
        ]

        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT_INSTALLATION,
            door_types=["木门", "合金门"],
            door_quantity=3,
            size_list=size_data,
            status=InstallationStatus.PENDING,
        )

        self.assertEqual(len(task.size_list), 2)
        self.assertEqual(task.size_list[0]["type"], "木门")
        self.assertEqual(task.size_list[0]["width"], 800)
        self.assertEqual(task.size_list[1]["type"], "合金门")
        self.assertEqual(task.size_list[1]["quantity"], 1)

    def test_installation_task_cancel_reason(self):
        """测试取消原因字段"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            door_quantity=2,
            status=InstallationStatus.CANCELLED,
            cancel_reason="客户临时取消安装",
        )
        self.assertEqual(task.status, InstallationStatus.CANCELLED)
        self.assertEqual(task.cancel_reason, "客户临时取消安装")

    def test_installation_task_additional_items(self):
        """测试增项说明字段"""
        task_no = f"INST-{uuid.uuid4().hex[:8]}"
        task = InstallationTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT_INSTALLATION,
            door_quantity=1,
            status=InstallationStatus.COMPLETED,
            additional_items="增加门锁安装、门框加固",
        )
        self.assertEqual(task.additional_items, "增加门锁安装、门框加固")
        self.assertEqual(task.status, InstallationStatus.COMPLETED)


# 注意：外键关联测试（如installers、assigned_by、order等）需要创建相关模型实例
# 目前先测试独立功能，后续集成测试中验证关联关系
