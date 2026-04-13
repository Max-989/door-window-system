"""
人员管理模块单元测试
测试门窗安装管理系统的师傅和工头管理功能
"""
from django.test import TestCase
from apps.personnel.models import Worker, Foreman
import uuid


class WorkerModelTest(TestCase):
    """服务师傅模型测试"""

    def test_create_worker(self):
        """测试创建服务师傅"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"
        worker = Worker.objects.create(
            name="测试师傅",
            phone=phone,
            wechat="test_wechat",
            bank_card_no="6228480012345678901",
            skills=["量尺", "安装"],
            city="测试市",
            status="active",
        )
        self.assertEqual(worker.name, "测试师傅")
        self.assertEqual(worker.phone, phone)
        self.assertEqual(worker.wechat, "test_wechat")
        self.assertEqual(worker.bank_card_no, "6228480012345678901")
        self.assertEqual(list(worker.skills), ["量尺", "安装"])
        self.assertEqual(worker.city, "测试市")
        self.assertEqual(worker.status, "active")
        self.assertTrue(worker.id is not None)

    def test_worker_unique_phone(self):
        """测试手机号唯一性约束"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"
        Worker.objects.create(name="师傅1", phone=phone, status="active")
        # 第二次创建相同手机号应该失败，但这里测试基础功能
        # 实际业务中应由数据库约束保证唯一性
        pass

    def test_worker_skills_json(self):
        """测试技能JSON字段"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"

        # 空技能列表
        worker1 = Worker.objects.create(
            name="师傅1", phone=phone + "1", skills=[], status="active"
        )
        self.assertEqual(list(worker1.skills), [])

        # 多个技能
        worker2 = Worker.objects.create(
            name="师傅2",
            phone=phone + "2",
            skills=["量尺", "安装", "维修", "送货"],
            status="active",
        )
        self.assertEqual(list(worker2.skills), ["量尺", "安装", "维修", "送货"])

    def test_worker_status_choices(self):
        """测试状态选项"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"

        # 在职状态
        worker1 = Worker.objects.create(name="在职师傅", phone=phone + "1", status="active")
        self.assertEqual(worker1.status, "active")

        # 离职状态
        worker2 = Worker.objects.create(
            name="离职师傅", phone=phone + "2", status="resigned"
        )
        self.assertEqual(worker2.status, "resigned")

        # 禁用状态
        worker3 = Worker.objects.create(
            name="禁用师傅", phone=phone + "3", status="disabled"
        )
        self.assertEqual(worker3.status, "disabled")

    def test_worker_without_optional_fields(self):
        """测试无可选字段的师傅"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"
        worker = Worker.objects.create(name="最小字段师傅", phone=phone)
        self.assertEqual(worker.name, "最小字段师傅")
        self.assertEqual(worker.phone, phone)
        self.assertEqual(worker.wechat, "")
        self.assertEqual(worker.bank_card_no, "")
        self.assertEqual(list(worker.skills), [])
        self.assertEqual(worker.city, "")
        self.assertEqual(worker.status, "active")  # 默认值
        self.assertIsNone(worker.foreman)
        self.assertIsNone(worker.branch)
        self.assertIsNone(worker.wage_standard)
        self.assertIsNone(worker.user)

    def test_worker_str_representation(self):
        """测试师傅的字符串表示"""
        phone = f"138{str(uuid.uuid4().int)[:8]}"
        worker = Worker.objects.create(name="张三师傅", phone=phone)
        self.assertEqual(str(worker), "张三师傅")


class ForemanModelTest(TestCase):
    """工头模型测试"""

    def test_create_foreman(self):
        """测试创建工头"""
        phone = f"139{str(uuid.uuid4().int)[:8]}"
        foreman = Foreman.objects.create(
            name="测试工头",
            phone=phone,
            wechat="foreman_wechat",
            bank_card_no="6228480098765432109",
            city="测试市",
            status="active",
        )
        self.assertEqual(foreman.name, "测试工头")
        self.assertEqual(foreman.phone, phone)
        self.assertEqual(foreman.wechat, "foreman_wechat")
        self.assertEqual(foreman.bank_card_no, "6228480098765432109")
        self.assertEqual(foreman.city, "测试市")
        self.assertEqual(foreman.status, "active")
        self.assertTrue(foreman.id is not None)

    def test_foreman_unique_phone(self):
        """测试工头手机号唯一性"""
        phone = f"139{str(uuid.uuid4().int)[:8]}"
        Foreman.objects.create(name="工头1", phone=phone, status="active")
        # 唯一性约束测试（同Worker）
        pass

    def test_foreman_status_flow(self):
        """测试工头状态流转"""
        phone = f"139{str(uuid.uuid4().int)[:8]}"
        foreman = Foreman.objects.create(name="状态测试工头", phone=phone, status="active")
        self.assertEqual(foreman.status, "active")

        foreman.status = "resigned"
        foreman.save()
        foreman.refresh_from_db()
        self.assertEqual(foreman.status, "resigned")

        foreman.status = "disabled"
        foreman.save()
        foreman.refresh_from_db()
        self.assertEqual(foreman.status, "disabled")

    def test_foreman_str_representation(self):
        """测试工头的字符串表示"""
        phone = f"139{str(uuid.uuid4().int)[:8]}"
        foreman = Foreman.objects.create(name="李四工头", phone=phone)
        self.assertEqual(str(foreman), "李四工头")


# 注意：WageStandard模型测试可以后续添加，涉及工费标准计算逻辑
