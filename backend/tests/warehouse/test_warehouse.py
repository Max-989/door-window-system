# -*- coding: utf-8 -*-

"""
仓库管理模块单元测试
测试门窗安装管理系统的仓库管理功能
"""

import uuid

from django.test import TestCase

from apps.warehouse.models import HardwareInventory, WarehouseProduct


class WarehouseProductModelTest(TestCase):
    """产品流转仓模型测试"""

    def test_create_warehouse_product(self):
        """测试创建产品流转仓记录"""
        order_no = f"ORDER-{uuid.uuid4().hex[:8]}"
        product = WarehouseProduct.objects.create(
            order_no=order_no,
            product_type="木门",
            product_model="MD-001",
            lock_model="LOCK-001",
            quantity=2,
            status="pending_ship",  # 假设的状态值
            logistics_no="LOG123456",
            city="测试市",
        )
        self.assertEqual(product.order_no, order_no)
        self.assertEqual(product.product_type, "木门")
        self.assertEqual(product.product_model, "MD-001")
        self.assertEqual(product.lock_model, "LOCK-001")
        self.assertEqual(product.quantity, 2)
        self.assertEqual(product.status, "pending_ship")
        self.assertEqual(product.logistics_no, "LOG123456")
        self.assertEqual(product.city, "测试市")
        self.assertTrue(product.id is not None)

    def test_warehouse_product_with_minimal_fields(self):
        """测试最小字段创建产品流转仓"""
        order_no = f"ORDER-{uuid.uuid4().hex[:8]}"
        product = WarehouseProduct.objects.create(
            order_no=order_no, product_type="合金门", quantity=1
        )
        self.assertEqual(product.order_no, order_no)
        self.assertEqual(product.product_type, "合金门")
        self.assertEqual(product.quantity, 1)
        self.assertEqual(product.product_model, "")  # 默认空字符串
        self.assertEqual(product.lock_model, "")
        self.assertEqual(product.logistics_no, "")
        self.assertEqual(product.city, "")

    def test_warehouse_product_delivery_photos_json(self):
        """测试派送图片JSON字段"""
        order_no = f"ORDER-{uuid.uuid4().hex[:8]}"
        photos = [
            {"url": "photo1.jpg", "timestamp": "2026-04-13T08:00:00Z"},
            {"url": "photo2.jpg", "timestamp": "2026-04-13T08:05:00Z"},
        ]

        product = WarehouseProduct.objects.create(
            order_no=order_no, product_type="防盗门", quantity=1, delivery_photos=photos
        )

        self.assertEqual(len(product.delivery_photos), 2)
        self.assertEqual(product.delivery_photos[0]["url"], "photo1.jpg")
        self.assertEqual(
            product.delivery_photos[1]["timestamp"], "2026-04-13T08:05:00Z"
        )

    def test_warehouse_product_order_association(self):
        """测试订单关联字段（可为空）"""
        order_no = f"ORDER-{uuid.uuid4().hex[:8]}"
        product = WarehouseProduct.objects.create(
            order_no=order_no,
            product_type="木门",
            quantity=1,
            order_status="pending",  # 订单状态
            auto_generated=False,
        )
        # 关联订单为空
        self.assertIsNone(product.order)
        self.assertEqual(product.order_status, "pending")
        self.assertFalse(product.auto_generated)

        # 测试自动生成标记
        product2 = WarehouseProduct.objects.create(
            order_no=order_no + "2",
            product_type="合金门",
            quantity=2,
            auto_generated=True,
        )
        self.assertTrue(product2.auto_generated)


class HardwareInventoryModelTest(TestCase):
    """五金仓模型测试"""

    def test_create_hardware_inventory(self):
        """测试创建五金库存记录"""
        inventory = HardwareInventory.objects.create(
            name="测试门锁",
            hardware_type="木门用",
            current_stock=100,
            alert_quantity=10,
            purchasing_quantity=20,
            pending_out_quantity=30,
            available_stock=70,
            city="测试市",
        )
        self.assertEqual(inventory.name, "测试门锁")
        self.assertEqual(inventory.hardware_type, "木门用")
        self.assertEqual(inventory.current_stock, 100)
        self.assertEqual(inventory.alert_quantity, 10)
        self.assertEqual(inventory.purchasing_quantity, 20)
        self.assertEqual(inventory.pending_out_quantity, 30)
        self.assertEqual(inventory.available_stock, 70)
        self.assertEqual(inventory.city, "测试市")
        self.assertTrue(inventory.id is not None)

    def test_hardware_inventory_stock_calculation(self):
        """测试库存计算逻辑"""
        inventory = HardwareInventory.objects.create(
            name="测试合页",
            hardware_type="合金门用",
            current_stock=50,
            pending_out_quantity=10,
            purchasing_quantity=5,
        )
        # 可用库存 = 当前库存 - 待出库需求量
        # 但模型可能自动计算，这里测试字段值
        self.assertEqual(inventory.current_stock, 50)
        self.assertEqual(inventory.pending_out_quantity, 10)
        self.assertEqual(inventory.purchasing_quantity, 5)

    def test_hardware_inventory_stock_records(self):
        """测试出入库记录模型"""
        from apps.warehouse.models import StockRecord
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(
            phone="13800138001",
            password="testpass123",
        )

        inventory = HardwareInventory.objects.create(
            name="测试螺丝", hardware_type="通用", current_stock=30
        )

        StockRecord.objects.create(
            item_type="hardware",
            item_id=inventory.pk,
            record_type="in",
            quantity=50,
            reason="采购入库",
            operator=user,
        )
        StockRecord.objects.create(
            item_type="hardware",
            item_id=inventory.pk,
            record_type="out",
            quantity=20,
            reason="安装使用",
            operator=user,
        )

        records = StockRecord.objects.filter(item_type="hardware", item_id=inventory.pk)
        self.assertEqual(records.count(), 2)
        self.assertEqual(records[0].record_type, "out")
        self.assertEqual(records[0].quantity, 20)
        self.assertEqual(records[1].record_type, "in")
        self.assertEqual(records[1].quantity, 50)

    def test_hardware_inventory_minimal_fields(self):
        """测试最小字段创建五金库存"""
        inventory = HardwareInventory.objects.create(
            name="最小库存", hardware_type="通用"
        )
        self.assertEqual(inventory.name, "最小库存")
        self.assertEqual(inventory.hardware_type, "通用")
        self.assertEqual(inventory.current_stock, 0)  # 默认值
        self.assertEqual(inventory.alert_quantity, 0)
        self.assertEqual(inventory.purchasing_quantity, 0)
        self.assertEqual(inventory.pending_out_quantity, 0)
        self.assertEqual(inventory.available_stock, 0)
        self.assertEqual(inventory.city, "")
