"""
产品模块单元测试
测试门窗安装管理系统的产品库功能
"""
from django.test import TestCase

from apps.products.models import ProductCategory, Supplier, WoodProduct
from common.enums import ProductLine, ProductStatus


class SupplierModelTest(TestCase):
    """供货厂家模型测试"""

    def test_create_supplier(self):
        """测试创建供货厂家"""
        supplier = Supplier.objects.create(
            name="测试门窗厂",
            product_type=ProductLine.WOOD,
            contact_person="张经理",
            phone="13800138000",
            address="测试地址123号",
            status=ProductStatus.ON_SALE,
        )
        self.assertEqual(supplier.name, "测试门窗厂")
        self.assertEqual(supplier.product_type, ProductLine.WOOD)
        self.assertEqual(supplier.status, ProductStatus.ON_SALE)
        self.assertTrue(supplier.id is not None)

    def test_supplier_str_representation(self):
        """测试供货厂家的字符串表示"""
        supplier = Supplier.objects.create(name="测试厂家", product_type=ProductLine.ALLOY)
        self.assertEqual(str(supplier), "测试厂家")

    def test_supplier_phone_validation(self):
        """测试电话号码验证"""
        # 有效电话号码
        supplier = Supplier.objects.create(
            name="有效电话厂家", product_type=ProductLine.WOOD, phone="13800138000"
        )
        self.assertEqual(supplier.phone, "13800138000")

        # 空电话应该允许
        supplier2 = Supplier.objects.create(
            name="空电话厂家", product_type=ProductLine.ALLOY, phone=""
        )
        self.assertEqual(supplier2.phone, "")


class ProductCategoryModelTest(TestCase):
    """产品线分类模型测试"""

    def test_create_category(self):
        """测试创建产品线分类"""
        category = ProductCategory.objects.create(
            name="测试产品线", code="TEST001", sort_order=1, is_active=True
        )
        self.assertEqual(category.name, "测试产品线")
        self.assertEqual(category.code, "TEST001")
        self.assertEqual(category.sort_order, 1)
        self.assertTrue(category.is_active)

    def test_category_ordering(self):
        """测试产品线分类排序"""
        ProductCategory.objects.create(name="B", code="B", sort_order=2)
        ProductCategory.objects.create(name="A", code="A", sort_order=1)
        ProductCategory.objects.create(name="C", code="C", sort_order=3)

        categories = list(ProductCategory.objects.all())
        self.assertEqual(categories[0].name, "A")
        self.assertEqual(categories[1].name, "B")
        self.assertEqual(categories[2].name, "C")


class WoodProductModelTest(TestCase):
    """木门产品测试"""

    def setUp(self):
        """测试前置设置"""
        self.supplier = Supplier.objects.create(
            name="木门供应商", product_type=ProductLine.WOOD
        )

    def test_create_wood_product(self):
        """测试创建木门产品"""
        product = WoodProduct.objects.create(
            name="测试木门",
            surface_process="PAINT",
            model="MD-001",
            colors=["白色", "原木色"],
            supplier=self.supplier,
            cost_price=1500.00,
            status=ProductStatus.ON_SALE,
        )
        self.assertEqual(product.name, "测试木门")
        self.assertEqual(product.surface_process, "PAINT")
        self.assertEqual(product.cost_price, 1500.00)
        self.assertEqual(product.status, ProductStatus.ON_SALE)
        self.assertEqual(list(product.colors), ["白色", "原木色"])

    def test_wood_product_without_supplier(self):
        """测试无供应商的木门产品"""
        product = WoodProduct.objects.create(
            name="无供应商木门", surface_process="VENEER", cost_price=1000.00
        )
        self.assertIsNone(product.supplier)
        self.assertEqual(product.name, "无供应商木门")


# 注意：更多测试可以逐步添加，覆盖合金门、防盗门、五金配件等模型
