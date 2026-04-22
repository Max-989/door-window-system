# -*- coding: utf-8 -*-
"""verify_data.py - 验证测试数据"""

import os
import sys
from collections import Counter

import django

from apps.decoration.models import Brand, DecorationStaff, Store
from apps.installations.models import InstallationTask
from apps.maintenance.models import MaintenanceTask
from apps.measurements.models import MeasurementTask
from apps.orders.models import Order, OrderItem
from apps.personnel.models import Foreman, WageStandard, Worker
from apps.products.models import AlloyProduct, SecurityProduct, Supplier, WoodProduct
from apps.users.models import Branch, User
from common.enums import OrderStatus

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
django.setup()


def verify():
    print("=" * 60)
    print("  数据验证报告")
    print("=" * 60)

    branches = Branch.objects.all()
    print(f"\n[分公司] {branches.count()} 条")
    for b in branches:
        print(f"  - {b.name} ({b.city})")

    brands = Brand.objects.all()
    stores = Store.objects.all()
    print(f"\n[品牌] {brands.count()} 条")
    for b in brands:
        s_count = b.stores.count()
        print(f"  - {b.name} ({s_count} 个门店)")

    ds = DecorationStaff.objects.all()
    print(f"\n[装企人员] {ds.count()} 条")
    for s in ds:
        print(f"  - {s.name} ({s.get_role_display()}) @ {s.store.name}")

    users = User.objects.all()
    print(f"\n[系统用户] {users.count()} 条")
    for u in users:
        print(
            f"  - {u.real_name} ({u.phone}) identity={u.identity}, branch={u.branch.name if u.branch else 'N/A'}"
        )

    suppliers = Supplier.objects.all()
    print(f"\n[供货厂家] {suppliers.count()} 条")
    for s in suppliers:
        print(f"  - {s.name} ({s.get_product_type_display()})")

    wp = WoodProduct.objects.count()
    ap = AlloyProduct.objects.count()
    sp = SecurityProduct.objects.count()
    print(f"\n[产品] 木门:{wp}, 合金门:{ap}, 防盗门:{sp}")

    ws = WageStandard.objects.count()
    fm = Foreman.objects.count()
    wk = Worker.objects.count()
    print(f"\n[人员] 工费标准:{ws}, 工头:{fm}, 师傅:{wk}")
    for f in Foreman.objects.all():
        print(f"  工头 {f.name}: {f.workers.count()} 个师傅")

    orders = Order.objects.all()
    status_dist = Counter(orders.values_list("status", flat=True))
    print(f"\n[订单] {orders.count()} 条")
    print("  状态分布:")
    for status_val, label in OrderStatus.CHOICES:
        cnt = status_dist.get(status_val, 0)
        marker = "OK" if cnt > 0 else "MISSING!"
        print(f"    {label}({status_val}): {cnt}  [{marker}]")

    items = OrderItem.objects.count()
    print(f"  订单明细: {items} 条")

    ins = InstallationTask.objects.all()
    print(f"\n[安装任务] {ins.count()} 条")
    for t in ins:
        installer_names = ", ".join([w.name for w in t.installers.all()])
        print(
            f"  - {t.task_no} status={t.status}, 师傅=[{installer_names}], 门数={t.door_quantity}"
        )

    msr = MeasurementTask.objects.all()
    print(f"\n[量尺任务] {msr.count()} 条")
    for t in msr:
        print(
            f"  - {t.task_no} status={t.status}, 师傅={t.assigned_to.name if t.assigned_to else '未派'}, 地址={t.customer_address}"
        )

    mnt = MaintenanceTask.objects.all()
    print(f"\n[维修任务] {mnt.count()} 条")
    for t in mnt:
        resp_display = t.get_responsibility_display() if t.responsibility else "未判定"
        print(
            f"  - {t.task_no} status={t.status}, 责任={resp_display}, 师傅={t.assigned_to.name if t.assigned_to else '未派'}"
        )

    all_statuses = set(s[0] for s in OrderStatus.CHOICES)
    covered = status_dist.keys()
    missing = all_statuses - set(covered)
    print(f"\n{'=' * 60}")
    if missing:
        print(f"  [WARNING] 订单未覆盖状态: {missing}")
    else:
        print("  [OK] 订单状态全覆盖!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    verify()
