# -*- coding: utf-8 -*-

"""
维护管理模块单元测试
测试门窗安装管理系统的维修任务功能
"""
import uuid

from django.test import TestCase

from apps.maintenance.models import MaintenanceTask
from common.enums import MaintenanceResponsibility, MaintenanceStatus, OrderSource


class MaintenanceTaskModelTest(TestCase):
    """维修任务模型测试"""

    def test_create_maintenance_task(self):
        """测试创建维修任务（基本字段）"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            customer_name="测试客户",
            customer_phone="13800138000",
            status=MaintenanceStatus.PENDING,
            responsibility=MaintenanceResponsibility.NONE,
        )
        self.assertEqual(task.task_no, task_no)
        self.assertEqual(task.source, OrderSource.BRAND_STORE)
        self.assertEqual(task.customer_name, "测试客户")
        self.assertEqual(task.customer_phone, "13800138000")
        self.assertEqual(task.status, MaintenanceStatus.PENDING)
        self.assertEqual(task.responsibility, MaintenanceResponsibility.NONE)
        self.assertTrue(task.id is not None)

    def test_maintenance_task_status_flow(self):
        """测试维修任务状态流转"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT,
            customer_name="状态测试客户",
            responsibility=MaintenanceResponsibility.INSTALLATION,
            status=MaintenanceStatus.PENDING,
        )
        # 初始状态为PENDING
        self.assertEqual(task.status, MaintenanceStatus.PENDING)

        # 状态变更
        task.status = MaintenanceStatus.ASSIGNED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MaintenanceStatus.ASSIGNED)

        task.status = MaintenanceStatus.COMPLETED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MaintenanceStatus.COMPLETED)

        task.status = MaintenanceStatus.CANCELLED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MaintenanceStatus.CANCELLED)

        # 部分完成状态
        task.status = MaintenanceStatus.PARTIAL
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MaintenanceStatus.PARTIAL)

    def test_maintenance_task_responsibility_choices(self):
        """测试责任判定字段"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"

        # 无责任
        task1 = MaintenanceTask.objects.create(
            task_no=task_no + "1",
            source=OrderSource.BRAND_STORE,
            customer_name="客户1",
            responsibility=MaintenanceResponsibility.NONE,
            status=MaintenanceStatus.PENDING,
        )
        self.assertEqual(task1.responsibility, MaintenanceResponsibility.NONE)

        # 安装责任
        task2 = MaintenanceTask.objects.create(
            task_no=task_no + "2",
            source=OrderSource.DIRECT,
            customer_name="客户2",
            responsibility=MaintenanceResponsibility.INSTALLATION,
            status=MaintenanceStatus.ASSIGNED,
        )
        self.assertEqual(task2.responsibility, MaintenanceResponsibility.INSTALLATION)

        # 工厂责任
        task3 = MaintenanceTask.objects.create(
            task_no=task_no + "3",
            source=OrderSource.DIRECT_TASK,
            customer_name="客户3",
            responsibility=MaintenanceResponsibility.FACTORY,
            status=MaintenanceStatus.COMPLETED,
        )
        self.assertEqual(task3.responsibility, MaintenanceResponsibility.FACTORY)

    def test_maintenance_task_issue_description(self):
        """测试问题描述字段"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            customer_name="问题描述客户",
            status=MaintenanceStatus.PENDING,
            responsibility=MaintenanceResponsibility.NONE,
            issue_description="门扇变形，无法正常关闭",
        )
        self.assertEqual(task.issue_description, "门扇变形，无法正常关闭")

    def test_maintenance_task_without_customer_info(self):
        """测试无客户信息的维修任务"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            responsibility=MaintenanceResponsibility.NONE,
            status=MaintenanceStatus.PENDING,
        )
        # 客户姓名和电话可为空
        self.assertEqual(task.customer_name, "")
        self.assertEqual(task.customer_phone, "")

    def test_maintenance_task_accessory_reissue(self):
        """测试配件重发字段"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT,
            customer_name="配件测试客户",
            status=MaintenanceStatus.COMPLETED,
            responsibility=MaintenanceResponsibility.FACTORY,
            accessory_reissue=True,
            accessory_reissue_reason="门锁损坏需要更换",
        )
        self.assertTrue(task.accessory_reissue)
        self.assertEqual(task.accessory_reissue_reason, "门锁损坏需要更换")

        # 测试不重发配件
        task2 = MaintenanceTask.objects.create(
            task_no=task_no + "2",
            source=OrderSource.DIRECT_TASK,
            customer_name="客户2",
            status=MaintenanceStatus.COMPLETED,
            responsibility=MaintenanceResponsibility.NONE,
            accessory_reissue=False,
        )
        self.assertFalse(task2.accessory_reissue)
        self.assertEqual(task2.accessory_reissue_reason, "")

    def test_maintenance_task_repair_details(self):
        """测试维修详情JSON字段"""
        task_no = f"MAINT-{uuid.uuid4().hex[:8]}"
        repair_data = [
            {"part": "门锁", "action": "更换", "quantity": 1},
            {"part": "合页", "action": "调整", "quantity": 2},
        ]

        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.DIRECT,
            customer_name="维修详情客户",
            status=MaintenanceStatus.COMPLETED,
            responsibility=MaintenanceResponsibility.INSTALLATION,
            repair_details=repair_data,
        )

        self.assertEqual(len(task.repair_details), 2)
        self.assertEqual(task.repair_details[0]["part"], "门锁")
        self.assertEqual(task.repair_details[0]["action"], "更换")
        self.assertEqual(task.repair_details[1]["part"], "合页")
        self.assertEqual(task.repair_details[1]["quantity"], 2)
