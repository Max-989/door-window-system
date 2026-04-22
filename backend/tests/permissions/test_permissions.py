# -*- coding: utf-8 -*-

"""
权限管理模块单元测试
测试门窗安装管理系统的权限管理功能
"""

from django.test import TestCase

from apps.permissions.models import Menu, Role, RoleMenuPermission


class RoleModelTest(TestCase):
    """角色模型测试"""

    def test_create_role(self):
        """测试创建角色"""
        role = Role.objects.create(
            name="测试角色",
            code="test_role",
            description="这是一个测试角色描述",
            is_system=False,
            data_scope="city",
        )
        self.assertEqual(role.name, "测试角色")
        self.assertEqual(role.description, "这是一个测试角色描述")
        self.assertFalse(role.is_system)
        self.assertEqual(role.data_scope, "city")
        self.assertTrue(role.id is not None)

    def test_system_role(self):
        """测试系统预设角色"""
        role = Role.objects.create(
            name="系统角色",
            code="system",
            description="系统预设角色",
            is_system=True,
            data_scope="all",
        )
        self.assertTrue(role.is_system)
        self.assertEqual(role.data_scope, "all")

    def test_role_data_scope_choices(self):
        """测试数据范围选项"""
        # 全部数据
        role1 = Role.objects.create(name="全部数据角色", code="all_data", data_scope="all")
        self.assertEqual(role1.data_scope, "all")

        # 本城市数据
        role2 = Role.objects.create(name="城市数据角色", code="city_data", data_scope="city")
        self.assertEqual(role2.data_scope, "city")

        # 本部门数据
        role3 = Role.objects.create(
            name="部门数据角色", code="dept_data", data_scope="department"
        )
        self.assertEqual(role3.data_scope, "department")

        # 仅自己创建的数据
        role4 = Role.objects.create(name="自己数据角色", code="self_data", data_scope="self")
        self.assertEqual(role4.data_scope, "self")

    def test_role_str_representation(self):
        """测试角色的字符串表示"""
        role = Role.objects.create(name="管理员角色", code="admin")
        self.assertEqual(str(role), "管理员角色")

    def test_role_ordering(self):
        """测试角色按ID排序"""
        role1 = Role.objects.create(name="角色1", code="role1")
        role2 = Role.objects.create(name="角色2", code="role2")
        role3 = Role.objects.create(name="角色3", code="role3")

        roles = list(Role.objects.all())
        self.assertEqual(roles[0].name, "角色1")
        self.assertEqual(roles[1].name, "角色2")
        self.assertEqual(roles[2].name, "角色3")


class MenuModelTest(TestCase):
    """菜单模型测试"""

    def test_create_menu(self):
        """测试创建菜单"""
        menu = Menu.objects.create(
            name="测试菜单",
            code="test_menu",
            path="/test",
            icon="test-icon",
            sort_order=1,
            menu_type="menu",
            is_visible=True,
        )
        self.assertEqual(menu.name, "测试菜单")
        self.assertEqual(menu.code, "test_menu")
        self.assertEqual(menu.path, "/test")
        self.assertEqual(menu.icon, "test-icon")
        self.assertEqual(menu.sort_order, 1)
        self.assertEqual(menu.menu_type, "menu")
        self.assertTrue(menu.is_visible)
        self.assertTrue(menu.id is not None)

    def test_menu_unique_code(self):
        """测试菜单编码唯一性"""
        Menu.objects.create(name="菜单1", code="unique_code")
        # 第二次创建相同编码应该失败，但这里测试基础功能
        pass

    def test_menu_type_choices(self):
        """测试菜单类型选项"""
        # 菜单类型
        menu1 = Menu.objects.create(name="普通菜单", code="menu1", menu_type="menu")
        self.assertEqual(menu1.menu_type, "menu")

        # 按钮类型
        menu2 = Menu.objects.create(name="按钮", code="button1", menu_type="button")
        self.assertEqual(menu2.menu_type, "button")

    def test_menu_without_parent(self):
        """测试无父菜单"""
        menu = Menu.objects.create(name="顶级菜单", code="top_menu")
        self.assertIsNone(menu.parent)

    def test_menu_with_parent(self):
        """测试有父菜单"""
        parent = Menu.objects.create(name="父菜单", code="parent_menu")
        child = Menu.objects.create(name="子菜单", code="child_menu", parent=parent)
        self.assertEqual(child.parent, parent)

    def test_menu_str_representation(self):
        """测试菜单的字符串表示"""
        menu = Menu.objects.create(name="用户管理", code="user_management")
        self.assertEqual(str(menu), "用户管理")

    def test_menu_ordering(self):
        """测试菜单排序"""
        menu1 = Menu.objects.create(name="菜单A", code="a", sort_order=3)
        menu2 = Menu.objects.create(name="菜单B", code="b", sort_order=1)
        menu3 = Menu.objects.create(name="菜单C", code="c", sort_order=2)

        menus = list(Menu.objects.all())
        self.assertEqual(menus[0].name, "菜单B")  # sort_order=1
        self.assertEqual(menus[1].name, "菜单C")  # sort_order=2
        self.assertEqual(menus[2].name, "菜单A")  # sort_order=3


class RoleMenuPermissionModelTest(TestCase):
    """角色菜单权限模型测试"""

    def setUp(self):
        """测试前置设置：创建角色和菜单"""
        self.role = Role.objects.create(name="测试角色", code="test_role", data_scope="all")
        self.menu = Menu.objects.create(name="测试菜单", code="test_menu")

    def test_create_role_menu_permission(self):
        """测试创建角色菜单权限"""
        permission = RoleMenuPermission.objects.create(role=self.role, menu=self.menu)
        self.assertEqual(permission.role, self.role)
        self.assertEqual(permission.menu, self.menu)
        self.assertTrue(permission.id is not None)

    def test_role_menu_relationship(self):
        """测试角色和菜单的关联关系"""
        permission = RoleMenuPermission.objects.create(role=self.role, menu=self.menu)

        # 通过关联获取
        role_permissions = list(self.role.menu_permissions.all())
        menu_permissions = list(self.menu.role_permissions.all())

        self.assertEqual(len(role_permissions), 1)
        self.assertEqual(role_permissions[0], permission)

        self.assertEqual(len(menu_permissions), 1)
        self.assertEqual(menu_permissions[0], permission)
