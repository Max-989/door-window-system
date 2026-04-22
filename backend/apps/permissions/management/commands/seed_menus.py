# -*- coding: utf-8 -*-

"""
seed_menus - 初始化菜单种子数据
"""
from django.core.management.base import BaseCommand

from apps.permissions.models import Menu

MENUS = [
    # (code, name, path, icon, sort_order, menu_type, is_visible, children_codes)
    ("dashboard", "Dashboard", "/dashboard", "dashboard", 1, "menu", True, []),
    (
        "orders",
        "订单管理",
        "/orders",
        "shopping-cart",
        2,
        "menu",
        True,
        [
            ("orders-list", "订单列表", "", "", 1, "button", True),
            ("orders-create", "创建订单", "", "", 2, "button", True),
            ("orders-review", "订单审核", "", "", 3, "button", True),
        ],
    ),
    (
        "products",
        "产品管理",
        "/products",
        "box",
        3,
        "menu",
        True,
        [
            ("products-list", "产品列表", "", "", 1, "button", True),
            ("products-brands", "品牌管理", "", "", 2, "button", True),
            ("products-suppliers", "供应商管理", "", "", 3, "button", True),
        ],
    ),
    (
        "warehouse",
        "仓库管理",
        "/warehouse",
        "warehouse",
        4,
        "menu",
        True,
        [
            ("warehouse-hardware", "五金库存", "", "", 1, "button", True),
            ("warehouse-accessory", "配件库存", "", "", 2, "button", True),
            ("warehouse-temp", "临时库存", "", "", 3, "button", True),
            ("warehouse-transfer", "调拨管理", "", "", 4, "button", True),
        ],
    ),
    (
        "service",
        "服务管理",
        "/service",
        "tool",
        5,
        "menu",
        True,
        [
            ("service-measure", "量尺服务", "", "", 1, "button", True),
            ("service-install", "安装服务", "", "", 2, "button", True),
            ("service-maintain", "维修服务", "", "", 3, "button", True),
        ],
    ),
    (
        "personnel",
        "人员管理",
        "/personnel",
        "team",
        6,
        "menu",
        True,
        [
            ("personnel-field", "现场人员", "", "", 1, "button", True),
            ("personnel-office", "办公人员", "", "", 2, "button", True),
        ],
    ),
    (
        "decoration",
        "装企管理",
        "/decoration",
        "shop",
        7,
        "menu",
        True,
        [
            ("decoration-brands", "装企品牌", "", "", 1, "button", True),
            ("decoration-stores", "门店管理", "", "", 2, "button", True),
            ("decoration-staff", "装企人员", "", "", 3, "button", True),
        ],
    ),
    ("reports", "统计报表", "/reports", "bar-chart", 8, "menu", True, []),
    (
        "settings",
        "系统设置",
        "/settings",
        "setting",
        9,
        "menu",
        True,
        [
            ("settings-permissions", "权限管理", "", "", 1, "button", True),
            ("settings-roles", "角色管理", "", "", 2, "button", True),
            ("settings-members", "成员管理", "", "", 3, "button", True),
        ],
    ),
]


class Command(BaseCommand):
    help = "初始化菜单种子数据"

    def handle(self, *args, **options):
        Menu.objects.all().delete()
        created = 0
        for (
            code,
            name,
            path,
            icon,
            sort_order,
            menu_type,
            is_visible,
            children,
        ) in MENUS:
            parent = Menu.objects.create(
                code=code,
                name=name,
                path=path,
                icon=icon,
                sort_order=sort_order,
                menu_type=menu_type,
                is_visible=is_visible,
            )
            created += 1
            for c_code, c_name, c_path, c_icon, c_sort, c_type, c_vis in children:
                Menu.objects.create(
                    code=c_code,
                    name=c_name,
                    path=c_path,
                    icon=c_icon,
                    sort_order=c_sort,
                    menu_type=c_type,
                    is_visible=c_vis,
                    parent=parent,
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f"已创建 {created} 个菜单"))
