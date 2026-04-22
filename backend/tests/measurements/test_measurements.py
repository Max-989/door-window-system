# -*- coding: utf-8 -*-

"""
测量管理模块单元测试
测试门窗安装管理系统的量尺任务功能
"""

import uuid

from django.test import TestCase

from apps.measurements.models import MeasurementTask
from common.enums import MeasurementStatus


class MeasurementTaskModelTest(TestCase):
    """量尺任务模型测试"""

    def test_create_measurement_task(self):
        """测试创建量尺任务（基本字段）"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"
        task = MeasurementTask.objects.create(
            task_no=task_no,
            source="direct",
            customer_name="测试客户",
            customer_phone="13800138000",
            customer_address="测试地址123号",
            status=MeasurementStatus.PENDING,
        )
        self.assertEqual(task.task_no, task_no)
        self.assertEqual(task.source, "direct")
        self.assertEqual(task.customer_name, "测试客户")
        self.assertEqual(task.customer_phone, "13800138000")
        self.assertEqual(task.status, MeasurementStatus.PENDING)
        self.assertTrue(task.id is not None)

    def test_measurement_task_status_flow(self):
        """测试量尺任务状态流转"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"
        task = MeasurementTask.objects.create(
            task_no=task_no,
            source="brand_store",
            customer_name="状态测试客户",
            customer_address="测试地址",
            status=MeasurementStatus.PENDING,
        )
        # 初始状态为PENDING
        self.assertEqual(task.status, MeasurementStatus.PENDING)

        # 状态变更
        task.status = MeasurementStatus.ASSIGNED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MeasurementStatus.ASSIGNED)

        task.status = MeasurementStatus.COMPLETED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MeasurementStatus.COMPLETED)

        task.status = MeasurementStatus.CANCELLED
        task.save()
        task.refresh_from_db()
        self.assertEqual(task.status, MeasurementStatus.CANCELLED)

    def test_measurement_task_product_details_json(self):
        """测试产品明细JSON字段"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"
        product_data = [
            {
                "room": "客厅",
                "door_type": "木门",
                "width": 800,
                "height": 2000,
                "quantity": 2,
            },
            {
                "room": "卧室",
                "door_type": "合金门",
                "width": 700,
                "height": 1900,
                "quantity": 1,
            },
        ]

        task = MeasurementTask.objects.create(
            task_no=task_no,
            source="direct",
            customer_name="JSON测试客户",
            customer_address="测试地址",
            product_details=product_data,
            status=MeasurementStatus.PENDING,
        )

        self.assertEqual(len(task.product_details), 2)
        self.assertEqual(task.product_details[0]["room"], "客厅")
        self.assertEqual(task.product_details[0]["door_type"], "木门")
        self.assertEqual(task.product_details[1]["width"], 700)
        self.assertEqual(task.product_details[1]["quantity"], 1)

    def test_measurement_task_without_customer_info(self):
        """测试无客户信息的量尺任务"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"
        task = MeasurementTask.objects.create(
            task_no=task_no, source="brand_store", customer_address="仅地址"
        )
        # 客户姓名和电话可为空
        self.assertEqual(task.customer_name, "")
        self.assertEqual(task.customer_phone, "")
        self.assertEqual(task.customer_address, "仅地址")

    def test_measurement_task_source_values(self):
        """测试来源字段值"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"

        # brand_store 来源
        task1 = MeasurementTask.objects.create(
            task_no=task_no + "1", source="brand_store", customer_address="地址1"
        )
        self.assertEqual(task1.source, "brand_store")

        # direct 来源
        task2 = MeasurementTask.objects.create(
            task_no=task_no + "2", source="direct", customer_address="地址2"
        )
        self.assertEqual(task2.source, "direct")

        # 其他来源（如果允许）
        task3 = MeasurementTask.objects.create(
            task_no=task_no + "3", source="other", customer_address="地址3"
        )
        self.assertEqual(task3.source, "other")

    def test_measurement_task_customer_phone_validation(self):
        """测试客户电话验证"""
        task_no = f"MEAS-{uuid.uuid4().hex[:8]}"

        # 有效电话
        task1 = MeasurementTask.objects.create(
            task_no=task_no + "1",
            source="direct",
            customer_phone="13800138000",
            customer_address="地址",
        )
        self.assertEqual(task1.customer_phone, "13800138000")

        # 空电话
        task2 = MeasurementTask.objects.create(
            task_no=task_no + "2",
            source="direct",
            customer_phone="",
            customer_address="地址",
        )
        self.assertEqual(task2.customer_phone, "")

        # 注意：无效电话可能会被验证器拒绝，但这里测试基本功能
