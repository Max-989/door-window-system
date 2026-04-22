# -*- coding: utf-8 -*-

"""
seed_roles - 初始化预设角色及菜单权限
"""

from django.core.management.base import BaseCommand

from apps.permissions.models import Menu, Role, RoleMenuPermission

# 每个角色对应的菜单 code 列表
ROLES = [
    {
        "name": "系统管理员",
        "description": "拥有系统全部权限",
        "is_system": True,
        "data_scope": "all",
        "menus": "__all__",
    },
    {
        "name": "项目经理",
        "description": "订单+产品+服务+装企+统计",
        "is_system": True,
        "data_scope": "city",
        "menus": [
            "dashboard",
            "orders",
            "orders-list",
            "orders-create",
            "orders-review",
            "products",
            "products-list",
            "products-brands",
            "products-suppliers",
            "service",
            "service-measure",
            "service-install",
            "service-maintain",
            "decoration",
            "decoration-brands",
            "decoration-stores",
            "decoration-staff",
            "reports",
        ],
    },
    {
        "name": "导购",
        "description": "订单查看/创建+产品查看",
        "is_system": True,
        "data_scope": "self",
        "menus": [
            "dashboard",
            "orders",
            "orders-list",
            "orders-create",
            "products",
            "products-list",
        ],
    },
    {
        "name": "仓库管理员",
        "description": "仓库全部+产品查看",
        "is_system": True,
        "data_scope": "city",
        "menus": [
            "dashboard",
            "warehouse",
            "warehouse-hardware",
            "warehouse-accessory",
            "warehouse-temp",
            "warehouse-transfer",
            "products",
            "products-list",
        ],
    },
    {
        "name": "现场服务人员",
        "description": "服务管理(自己)",
        "is_system": True,
        "data_scope": "self",
        "menus": [
            "dashboard",
            "service",
            "service-measure",
            "service-install",
            "service-maintain",
        ],
    },
    {
        "name": "文员",
        "description": "订单查看+产品查看+人员查看",
        "is_system": True,
        "data_scope": "city",
        "menus": [
            "dashboard",
            "orders",
            "orders-list",
            "products",
            "products-list",
            "personnel",
            "personnel-field",
            "personnel-office",
        ],
    },
]


class Command(BaseCommand):
    help = "初始化预设角色及菜单权限"

    def handle(self, *args, **options):
        Role.objects.all().delete()
        RoleMenuPermission.objects.all().delete()

        all_menu_codes = list(Menu.objects.values_list("code", flat=True))

        for role_data in ROLES:
            role = Role.objects.create(
                name=role_data["name"],
                description=role_data["description"],
                is_system=role_data["is_system"],
                data_scope=role_data["data_scope"],
            )

            codes = role_data["menus"]
            if codes == "__all__":
                codes = all_menu_codes

            menus = Menu.objects.filter(code__in=codes)
            perms = [RoleMenuPermission(role=role, menu=m) for m in menus]
            RoleMenuPermission.objects.bulk_create(perms)

            self.stdout.write(f"  角色 [{role.name}] → {len(perms)} 个菜单权限")

        self.stdout.write(self.style.SUCCESS(f"已创建 {len(ROLES)} 个预设角色"))
