# -*- coding: utf-8 -*-
"""
seed_data.py - 测试数据灌入脚本
使用方式: python manage.py seed_data (或 python seed_data.py)
"""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

import django
import pytz
from django.contrib.auth.hashers import make_password

from apps.decoration.models import Brand, DecorationStaff, Store
from apps.installations.models import InstallationTask
from apps.maintenance.models import MaintenanceTask
from apps.measurements.models import MeasurementTask
from apps.orders.models import Order, OrderItem
from apps.personnel.models import Foreman, WageStandard, Worker
from apps.products.models import AlloyProduct, SecurityProduct, Supplier, WoodProduct
from apps.users.models import Branch, User, UserProfile
from common.enums import (
    AlloyOpenMethod,
    AlloyTrackType,
    DecorationStatus,
    GlassType,
    InstallationStatus,
    MaintenanceResponsibility,
    MaintenanceStatus,
    MeasurementStatus,
    OrderSource,
    OrderStatus,
    OrderType,
    ProductLine,
    ProductStatus,
    SecurityOpenDirection,
    SecurityOpenMethod,
    SecuritySizeType,
    SupplierStatus,
    UserIdentity,
    UserStatus,
    WageBillingType,
    WoodSurfaceProcess,
    WorkerSkillType,
)

# 设置 Django 环境
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
django.setup()


TZ = pytz.timezone("Asia/Shanghai")


def now_aware():
    return datetime.now(TZ)


def clear_all():
    """清空所有测试数据（按依赖顺序）"""
    print("[INFO] 清空旧数据...")
    MaintenanceTask.objects.all().delete()
    InstallationTask.objects.all().delete()
    MeasurementTask.objects.all().delete()
    OrderItem.objects.all().delete()
    Order.objects.all().delete()
    UserProfile.objects.all().delete()
    Worker.objects.all().delete()
    Foreman.objects.all().delete()
    WageStandard.objects.all().delete()
    WoodProduct.objects.all().delete()
    AlloyProduct.objects.all().delete()
    SecurityProduct.objects.all().delete()
    Supplier.objects.all().delete()
    DecorationStaff.objects.all().delete()
    Store.objects.all().delete()
    Brand.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    Branch.objects.all().delete()
    print("[OK] 旧数据已清空")


def seed_branches():
    """3 个分公司"""
    print("[SEED] 分公司...")
    branches = []
    for name, city in [
        ("华东分公司", "上海"),
        ("华南分公司", "广州"),
        ("华北分公司", "北京"),
    ]:
        b = Branch.objects.create(name=name, city=city, address=f"{city}市某某路100号")
        branches.append(b)
    print(f"  -> 创建 {len(branches)} 个分公司")
    return branches


def seed_brands_and_stores():
    """5 个品牌 + 8 个门店"""
    print("[SEED] 品牌与门店...")
    brands = []
    stores = []
    brand_store_map = [
        ("美心门业", "上海店"),
        ("美心门业", "杭州店"),
        ("TATA木门", "北京旗舰店"),
        ("TATA木门", "南京店"),
        ("TATA木门", "苏州店"),
        ("盼盼防盗门", "广州店"),
        ("王力安防", "深圳店"),
        ("金迪木门", "宁波店"),
    ]
    for brand_name, store_name in brand_store_map:
        b, _ = Brand.objects.get_or_create(
            name=brand_name,
            defaults={"contact_person": f"{brand_name}联系人", "phone": "13800000001"},
        )
        if b not in brands:
            brands.append(b)
        s, _ = Store.objects.get_or_create(
            brand=b,
            name=store_name,
            defaults={"address": f"{store_name}地址某某路50号"},
        )
        if s not in stores:
            stores.append(s)
    print(f"  -> 创建 {len(brands)} 个品牌, {len(stores)} 个门店")
    return brands, stores


def seed_decoration_staff(stores):
    """6 个装企人员"""
    print("[SEED] 装企人员...")
    staff_list = []
    data = [
        (0, "张伟", "13800001001", "project_manager"),
        (0, "李娜", "13800001002", "sales_guide"),
        (1, "王强", "13800001003", "project_manager"),
        (2, "刘洋", "13800001004", "sales_guide"),
        (3, "陈明", "13800001005", "project_manager"),
        (4, "赵丽", "13800001006", "sales_guide"),
    ]
    for store_idx, name, phone, role in data:
        s = DecorationStaff.objects.create(
            store=stores[store_idx],
            name=name,
            phone=phone,
            role=role,
            status=DecorationStatus.COOPERATING,
        )
        staff_list.append(s)
    print(f"  -> 创建 {len(staff_list)} 个装企人员")
    return staff_list


def seed_users(branches):
    """5 个系统用户, 密码 123456"""
    print("[SEED] 系统用户...")
    users = []
    password = make_password("123456")
    data = [
        (
            "13100000001",
            "系统管理员",
            "admin",
            UserIdentity.CONTRACTOR,
            branches[0],
            True,
        ),
        (
            "13100000002",
            "文员小李",
            "clerk1",
            UserIdentity.CONTRACTOR,
            branches[0],
            False,
        ),
        (
            "13100000003",
            "文员小王",
            "clerk2",
            UserIdentity.CONTRACTOR,
            branches[1],
            False,
        ),
        (
            "13100000004",
            "文员小赵",
            "clerk3",
            UserIdentity.CONTRACTOR,
            branches[2],
            False,
        ),
        (
            "13100000005",
            "装企经理",
            "deco_mgr",
            UserIdentity.DECORATION,
            branches[0],
            False,
        ),
    ]
    for phone, name, product_line, identity, branch, is_staff in data:
        u = User.objects.create(
            phone=phone,
            real_name=name,
            password=password,
            identity=identity,
            branch=branch,
            product_line=product_line,
            status=UserStatus.ACTIVE,
            is_staff=is_staff,
        )
        users.append(u)
    print(f"  -> 创建 {len(users)} 个用户 (密码: 123456)")
    return users


def seed_suppliers():
    """4 个供货厂家"""
    print("[SEED] 供货厂家...")
    suppliers = []
    data = [
        ("重庆美心门业", ProductLine.WOOD, "张三", "13900001001", "重庆市九龙坡区"),
        ("浙江金迪门业", ProductLine.WOOD, "李四", "13900001002", "浙江省杭州市"),
        ("广东坚朗五金", ProductLine.ALLOY, "王五", "13900001003", "广东省东莞市"),
        ("辽宁盼盼安防", ProductLine.SECURITY, "赵六", "13900001004", "辽宁省营口市"),
    ]
    for name, ptype, contact, phone, addr in data:
        s = Supplier.objects.create(
            name=name,
            product_type=ptype,
            contact_person=contact,
            phone=phone,
            address=addr,
            status=SupplierStatus.COOPERATING,
        )
        suppliers.append(s)
    print(f"  -> 创建 {len(suppliers)} 个供货厂家")
    return suppliers


def seed_products(suppliers):
    """5 木门 + 3 合金门 + 4 防盗门"""
    print("[SEED] 产品...")

    # 木门产品
    wood_products = []
    wood_data = [
        (
            "美心实木复合门-A01",
            WoodSurfaceProcess.PAINT,
            "MX-A01",
            ["白色", "原木色"],
            suppliers[0],
            1200,
        ),
        (
            "美心免漆门-B02",
            WoodSurfaceProcess.BARE,
            "MX-B02",
            ["白色", "灰色"],
            suppliers[0],
            800,
        ),
        (
            "金迪原木门-C03",
            WoodSurfaceProcess.PAINT,
            "JD-C03",
            ["原木色", "胡桃木色"],
            suppliers[1],
            2500,
        ),
        (
            "金迪模压门-D04",
            WoodSurfaceProcess.BARE,
            "JD-D04",
            ["白色"],
            suppliers[1],
            600,
        ),
        (
            "美心拼色门-E05",
            WoodSurfaceProcess.PAINT,
            "MX-E05",
            ["白灰拼色", "黑白拼色"],
            suppliers[0],
            1500,
        ),
    ]
    for name, process, model, colors, supplier, cost in wood_data:
        p = WoodProduct.objects.create(
            name=name,
            surface_process=process,
            model=model,
            colors=colors,
            supplier=supplier,
            cost_price=Decimal(str(cost)),
            status=ProductStatus.ON_SALE,
        )
        wood_products.append(p)

    # 合金门产品
    alloy_products = []
    alloy_data = [
        (
            "坚朗平开门-A1",
            AlloyOpenMethod.SWING,
            AlloyTrackType.OVERHEAD,
            "6063铝型材",
            ["黑色", "香槟金"],
            GlassType.DOUBLE,
            "钢化中空玻璃",
            suppliers[2],
            Decimal("350"),
            80,
            50,
        ),
        (
            "坚朗单推门-B1",
            AlloyOpenMethod.SINGLE_SLIDE,
            AlloyTrackType.OVERHEAD,
            "钛镁合金",
            ["灰色", "黑色"],
            GlassType.SINGLE,
            "钢化玻璃",
            suppliers[2],
            Decimal("420"),
            100,
            40,
        ),
        (
            "坚朗双推门-C1",
            AlloyOpenMethod.DOUBLE_SLIDE,
            AlloyTrackType.FLOOR,
            "钛镁合金",
            ["香槟金"],
            GlassType.DOUBLE,
            "夹胶玻璃",
            suppliers[2],
            Decimal("480"),
            120,
            60,
        ),
    ]
    for (
        name,
        method,
        track,
        profile,
        colors,
        glass,
        glass_kind,
        supplier,
        price,
        over,
        gp,
    ) in alloy_data:
        p = AlloyProduct.objects.create(
            name=name,
            open_method=method,
            track_type=track,
            profile=profile,
            colors=colors,
            glass_type=glass,
            glass_kind=glass_kind,
            supplier=supplier,
            unit_price=price,
            oversize_fee=Decimal(str(over)),
            glass_price=Decimal(str(gp)),
            status=ProductStatus.ON_SALE,
        )
        alloy_products.append(p)

    # 防盗门产品
    security_products = []
    security_data = [
        (
            "盼盼甲级防盗门-F01",
            "PP-F01",
            ["灰色", "黑色"],
            SecurityOpenMethod.DOUBLE,
            SecurityOpenDirection.OR,
            SecuritySizeType.STANDARD,
            ["950x2050", "960x2050"],
            "不锈钢门框",
            {"door_material": "镀锌钢板", "thickness": "1.0mm"},
            200,
            Decimal("2800"),
            Decimal("3500"),
            suppliers[3],
        ),
        (
            "盼盼子母门-G01",
            "PP-G01",
            ["灰色"],
            SecurityOpenMethod.DOUBLE,
            SecurityOpenDirection.IL,
            SecuritySizeType.CUSTOM,
            [],
            "镀锌门框",
            {"door_material": "镀锌钢板", "thickness": "0.8mm"},
            300,
            Decimal("2200"),
            Decimal("3800"),
            suppliers[3],
        ),
        (
            "盼盼单开防盗门-H01",
            "PP-H01",
            ["黑色", "红色"],
            SecurityOpenMethod.SINGLE,
            SecurityOpenDirection.OR,
            SecuritySizeType.STANDARD,
            ["860x2050", "950x2050"],
            "不锈钢门框",
            {"door_material": "镀锌钢板", "thickness": "1.2mm"},
            200,
            Decimal("1800"),
            Decimal("2500"),
            suppliers[3],
        ),
        (
            "盼盼高端防盗门-I01",
            "PP-I01",
            ["古铜色", "黑色"],
            SecurityOpenMethod.DOUBLE,
            SecurityOpenDirection.OL,
            SecuritySizeType.CUSTOM,
            [],
            "豪华门框",
            {"door_material": "不锈钢", "thickness": "1.5mm"},
            500,
            Decimal("4500"),
            Decimal("6500"),
            suppliers[3],
        ),
    ]
    for (
        name,
        model,
        colors,
        method,
        direction,
        size_type,
        std_sizes,
        frame,
        fixed,
        smart_up,
        std_p,
        custom_p,
        supplier,
    ) in security_data:
        p = SecurityProduct.objects.create(
            name=name,
            model=model,
            door_colors=colors,
            open_method=method,
            open_direction=direction,
            size_type=size_type,
            standard_sizes=std_sizes,
            frame_type=frame,
            fixed_config=fixed,
            smart_lock_upcharge=Decimal(str(smart_up)),
            standard_price=std_p,
            custom_price=custom_p,
            supplier=supplier,
            status=ProductStatus.ON_SALE,
        )
        security_products.append(p)

    print(
        f"  -> 木门 {len(wood_products)}, 合金门 {len(alloy_products)}, 防盗门 {len(security_products)}"
    )
    return wood_products, alloy_products, security_products


def seed_personnel(branches):
    """2 工头 + 6 师傅"""
    print("[SEED] 人员管理...")

    # 工费标准 (先创建，师傅会引用)
    wage_standards = []
    ws_data = [
        (
            "默认量尺标准",
            WorkerSkillType.MEASUREMENT,
            WageBillingType.PER_TIME,
            Decimal("100"),
            branches[0],
            "",
            True,
        ),
        (
            "默认安装标准-木门",
            WorkerSkillType.INSTALLATION,
            WageBillingType.PER_DOOR,
            Decimal("80"),
            branches[0],
            ProductLine.WOOD,
            True,
        ),
        (
            "默认安装标准-合金门",
            WorkerSkillType.INSTALLATION,
            WageBillingType.PER_DOOR,
            Decimal("120"),
            branches[0],
            ProductLine.ALLOY,
            False,
        ),
        (
            "默认维修标准",
            WorkerSkillType.MAINTENANCE,
            WageBillingType.PER_TIME,
            Decimal("150"),
            branches[0],
            "",
            False,
        ),
    ]
    for name, skill, billing, price, branch, pline, is_def in ws_data:
        ws = WageStandard.objects.create(
            name=name,
            skill_type=skill,
            billing_type=billing,
            unit_price=price,
            branch=branch,
            product_line=pline,
            is_default=is_def,
        )
        wage_standards.append(ws)

    # 工头
    foremen = []
    for name, phone, branch_idx in [
        ("工头老孙", "15100001001", 0),
        ("工头老周", "15100001002", 1),
    ]:
        f = Foreman.objects.create(
            name=name,
            phone=phone,
            branch=branches[branch_idx],
            city=branches[branch_idx].city,
            commission_rate=Decimal("15.00"),
            status="active",
        )
        foremen.append(f)

    # 师傅
    workers = []
    worker_data = [
        (
            "师傅钱一",
            "15200001001",
            ["measurement", "installation"],
            foremen[0],
            branches[0],
            wage_standards[0],
        ),
        (
            "师傅钱二",
            "15200001002",
            ["installation"],
            foremen[0],
            branches[0],
            wage_standards[1],
        ),
        (
            "师傅孙三",
            "15200001003",
            ["installation", "maintenance"],
            foremen[0],
            branches[0],
            wage_standards[2],
        ),
        (
            "师傅李四",
            "15200001004",
            ["measurement", "installation"],
            foremen[1],
            branches[1],
            wage_standards[0],
        ),
        (
            "师傅周五",
            "15200001005",
            ["installation"],
            foremen[1],
            branches[1],
            wage_standards[1],
        ),
        (
            "师傅吴六",
            "15200001006",
            ["maintenance", "delivery"],
            foremen[1],
            branches[2],
            wage_standards[3],
        ),
    ]
    for name, phone, skills, foreman, branch, ws in worker_data:
        w = Worker.objects.create(
            name=name,
            phone=phone,
            skills=skills,
            foreman=foreman,
            branch=branch,
            city=branch.city,
            wage_standard=ws,
            status="active",
        )
        workers.append(w)

    print(f"  -> 工费标准 {len(wage_standards)}, 工头 {len(foremen)}, 师傅 {len(workers)}")
    return wage_standards, foremen, workers


def seed_orders(
    users,
    brands,
    stores,
    staff_list,
    branches,
    wood_products,
    alloy_products,
    security_products,
    workers,
):
    """20 个订单 + OrderItem, 覆盖所有 10 个状态"""
    print("[SEED] 订单...")

    statuses = list(OrderStatus.CHOICES)  # 10 个状态
    orders = []

    now = now_aware()
    for i in range(20):
        status_val = statuses[i % len(statuses)][0]  # 循环覆盖所有状态
        order_type = [OrderType.MAIN, OrderType.SUPPLEMENT, OrderType.AFTER_SALE][i % 3]
        product_line = [ProductLine.WOOD, ProductLine.ALLOY, ProductLine.SECURITY][
            i % 3
        ]

        if product_line == ProductLine.WOOD:
            pl = wood_products[i % len(wood_products)]
            pname = pl.name
            pmodel = pl.model
            pcolor = pl.colors[0] if pl.colors else ""
            unit_cost = pl.cost_price
            specs = {"width": "800", "height": "2050"}
        elif product_line == ProductLine.ALLOY:
            pl = alloy_products[i % len(alloy_products)]
            pname = pl.name
            pmodel = ""
            pcolor = pl.colors[0] if pl.colors else ""
            unit_cost = pl.unit_price
            specs = {"width": "900", "height": "2100", "area": "1.89"}
        else:
            pl = security_products[i % len(security_products)]
            pname = pl.name
            pmodel = pl.model
            pcolor = pl.door_colors[0] if pl.door_colors else ""
            unit_cost = pl.standard_price
            specs = {"width": "960", "height": "2050"}

        order_no = f"ORD{now.strftime('%Y%m%d')}{(i+1):04d}"
        created_time = now_aware() - timedelta(days=(20 - i))

        user = users[1 + (i % (len(users) - 1))]
        brand = brands[i % len(brands)]
        store = stores[i % len(stores)]
        staff = staff_list[i % len(staff_list)]
        branch = branches[i % len(branches)]

        order = Order.objects.create(
            order_no=order_no,
            source=OrderSource.BRAND_STORE,
            brand=brand,
            store=store,
            salesperson=staff,
            branch=branch,
            order_type=order_type,
            customer_name=f"客户{i+1:02d}",
            customer_phone=f"1700000{i+1:04d}",
            customer_address=f"测试地址{i+1}号",
            customer_price=unit_cost * (i % 3 + 1),
            cost_price=unit_cost * (i % 3 + 1),
            status=status_val,
            product_line=product_line,
            created_by=user,
            confirmed_by=user if status_val != OrderStatus.PENDING else None,
            notes=f"测试订单{i+1}",
            salesman_name=staff.name,
            salesman_phone=staff.phone,
        )
        order.created_at = created_time
        order.save(update_fields=["created_at"])

        # OrderItem
        if product_line == ProductLine.WOOD:
            OrderItem.objects.create(
                order=order,
                product_type=ProductLine.WOOD,
                wood_product=pl,
                product_name=pname,
                product_model=pmodel,
                color=pcolor,
                specs=specs,
                quantity=i % 3 + 1,
                unit_cost_price=unit_cost,
            )
        elif product_line == ProductLine.ALLOY:
            OrderItem.objects.create(
                order=order,
                product_type=ProductLine.ALLOY,
                alloy_product=pl,
                product_name=pname,
                product_model=pmodel,
                color=pcolor,
                specs=specs,
                quantity=i % 2 + 1,
                unit_cost_price=unit_cost,
            )
        else:
            OrderItem.objects.create(
                order=order,
                product_type=ProductLine.SECURITY,
                security_product=pl,
                product_name=pname,
                product_model=pmodel,
                color=pcolor,
                specs=specs,
                quantity=1,
                unit_cost_price=unit_cost,
            )

        orders.append(order)

    print(f"  -> 创建 {len(orders)} 个订单 (覆盖全部 {len(statuses)} 个状态)")
    return orders


def seed_installation_tasks(orders, workers, users, brands, stores, branches):
    """8 个安装任务"""
    print("[SEED] 安装任务...")
    tasks = []
    statuses_pool = [
        InstallationStatus.PENDING,
        InstallationStatus.ASSIGNED,
        InstallationStatus.COMPLETED,
        InstallationStatus.CANCELLED,
        InstallationStatus.PARTIAL,
        InstallationStatus.ASSIGNED,
        InstallationStatus.COMPLETED,
        InstallationStatus.PENDING,
    ]

    now = now_aware()
    for i in range(8):
        order = orders[i] if i < len(orders) else None
        status = statuses_pool[i]
        worker = workers[i % len(workers)]
        user = users[1 + (i % (len(users) - 1))]
        brand = brands[i % len(brands)]
        store = stores[i % len(stores)]
        branch = branches[i % len(branches)]

        task_no = f"INS{now.strftime('%Y%m%d')}{(i+1):04d}"
        created_time = now_aware() - timedelta(days=(8 - i))

        task = InstallationTask.objects.create(
            task_no=task_no,
            order=order,
            source=OrderSource.BRAND_STORE,
            brand=brand,
            store=store,
            branch=branch,
            customer_name=f"安装客户{i+1}",
            customer_phone=f"1700010{i+1:04d}",
            customer_address=f"安装地址{i+1}号",
            door_types=["wood", "alloy", "security"][i % 3],
            door_quantity=(i % 5) + 1,
            status=status,
            assigned_by=user if status != InstallationStatus.PENDING else None,
            installed_quantity=(
                (i % 5) + 1
                if status in [InstallationStatus.COMPLETED, InstallationStatus.PARTIAL]
                else 0
            ),
            additional_fee=Decimal("50") if i % 3 == 0 else Decimal("0"),
        )
        task.created_at = created_time
        task.save(update_fields=["created_at"])

        if status != InstallationStatus.PENDING:
            task.installers.add(worker)

        if status == InstallationStatus.COMPLETED:
            task.completed_at = now_aware() - timedelta(days=1)

        tasks.append(task)

    print(f"  -> 创建 {len(tasks)} 个安装任务")
    return tasks


def seed_measurement_tasks(
    workers, users, brands, stores, branches, staff_list, orders
):
    """6 个量尺任务"""
    print("[SEED] 量尺任务...")
    tasks = []
    valid_statuses = [s[0] for s in MeasurementStatus.CHOICES]
    statuses_pool = [
        MeasurementStatus.PENDING,
        MeasurementStatus.ASSIGNED,
        MeasurementStatus.COMPLETED,
        MeasurementStatus.CANCELLED,
        MeasurementStatus.COMPLETED,
        MeasurementStatus.ASSIGNED,
    ]

    now = now_aware()
    for i in range(6):
        status = statuses_pool[i]
        worker = workers[i % len(workers)]
        user = users[1 + (i % (len(users) - 1))]
        brand = brands[i % len(brands)]
        store = stores[i % len(stores)]
        branch = branches[i % len(branches)]
        staff = staff_list[i % len(staff_list)]

        task_no = f"MSR{now.strftime('%Y%m%d')}{(i+1):04d}"

        task = MeasurementTask.objects.create(
            task_no=task_no,
            source="brand_store",
            brand=brand,
            store=store,
            requested_by=staff,
            branch=branch,
            customer_name=f"量尺客户{i+1}",
            customer_phone=f"1700020{i+1:04d}",
            customer_address=f"量尺地址{i+1}号",
            product_details=[{"room": f"房间{i+1}", "product": "木门", "qty": 2}],
            assigned_to=worker if status != MeasurementStatus.PENDING else None,
            assigned_by=user if status != MeasurementStatus.PENDING else None,
            status=status,
            wage_amount=(
                Decimal("100")
                if status == MeasurementStatus.COMPLETED
                else Decimal("0")
            ),
        )

        if status == MeasurementStatus.COMPLETED:
            task.completed_at = now_aware() - timedelta(days=2)
            task.site_photos = ["photo1.jpg", "photo2.jpg"]
            task.measurement_data = {
                "door_width": "800",
                "door_height": "2050",
                "wall_thickness": "120",
            }
            task.save()

        # 关联订单
        if i < len(orders):
            task.orders.add(orders[i])

        tasks.append(task)

    print(f"  -> 创建 {len(tasks)} 个量尺任务")
    return tasks


def seed_maintenance_tasks(orders, workers, users, brands, stores, branches):
    """4 个维修任务"""
    print("[SEED] 维修任务...")
    tasks = []
    statuses_pool = [
        MaintenanceStatus.PENDING,
        MaintenanceStatus.ASSIGNED,
        MaintenanceStatus.COMPLETED,
        MaintenanceStatus.PARTIAL,
    ]
    responsibilities = [
        MaintenanceResponsibility.FACTORY,
        MaintenanceResponsibility.INSTALLATION,
        MaintenanceResponsibility.NONE,
        MaintenanceResponsibility.SITE,
    ]

    now = now_aware()
    for i in range(4):
        status = statuses_pool[i]
        resp = responsibilities[i]
        worker = workers[i % len(workers)]
        user = users[1 + (i % (len(users) - 1))]
        brand = brands[i % len(brands)]
        store = stores[i % len(stores)]
        branch = branches[i % len(branches)]

        task_no = f"MNT{now.strftime('%Y%m%d')}{(i+1):04d}"

        task = MaintenanceTask.objects.create(
            task_no=task_no,
            source=OrderSource.BRAND_STORE,
            brand=brand,
            store=store,
            branch=branch,
            original_order=orders[i + 10] if i + 10 < len(orders) else None,
            customer_name=f"维修客户{i+1}",
            customer_phone=f"1700030{i+1:04d}",
            customer_address=f"维修地址{i+1}号",
            issue_description=f"客户反馈{i+1}号订单产品存在问题: 门扇有划痕/锁具不灵敏/密封条脱落",
            issue_type=["划痕", "锁具问题", "密封条", "变形"][i],
            assigned_to=worker if status != MaintenanceStatus.PENDING else None,
            assigned_by=user if status != MaintenanceStatus.PENDING else None,
            status=status,
            responsibility=resp if status != MaintenanceStatus.PENDING else "",
            reviewed_by=user if status == MaintenanceStatus.COMPLETED else None,
            reviewed_at=(
                now_aware() - timedelta(days=1)
                if status == MaintenanceStatus.COMPLETED
                else None
            ),
            maintenance_fee=(
                Decimal("200")
                if status == MaintenanceStatus.COMPLETED
                else Decimal("0")
            ),
            wage_amount=(
                Decimal("150")
                if status == MaintenanceStatus.COMPLETED
                else Decimal("0")
            ),
            deduction_amount=(
                Decimal("50")
                if resp == MaintenanceResponsibility.INSTALLATION
                else Decimal("0")
            ),
            deduction_worker=(
                worker if resp == MaintenanceResponsibility.INSTALLATION else None
            ),
            resolution=("更换新门扇，已验收通过" if status == MaintenanceStatus.COMPLETED else ""),
        )

        if status == MaintenanceStatus.COMPLETED:
            task.completed_at = now_aware() - timedelta(days=1)

        tasks.append(task)

    print(f"  -> 创建 {len(tasks)} 个维修任务")
    return tasks


def main():
    print("=" * 50)
    print("  门窗系统 - 测试数据灌入")
    print("=" * 50)
    print()

    clear_all()

    branches = seed_branches()
    brands, stores = seed_brands_and_stores()
    staff_list = seed_decoration_staff(stores)
    users = seed_users(branches)
    suppliers = seed_suppliers()
    wood_products, alloy_products, security_products = seed_products(suppliers)
    wage_standards, foremen, workers = seed_personnel(branches)
    orders = seed_orders(
        users,
        brands,
        stores,
        staff_list,
        branches,
        wood_products,
        alloy_products,
        security_products,
        workers,
    )
    ins_tasks = seed_installation_tasks(
        orders, workers, users, brands, stores, branches
    )
    msr_tasks = seed_measurement_tasks(
        workers, users, brands, stores, branches, staff_list, orders
    )
    mnt_tasks = seed_maintenance_tasks(orders, workers, users, brands, stores, branches)

    print()
    print("=" * 50)
    print("  数据灌入完成!")
    print("=" * 50)
    print(f"  分公司: {Branch.objects.count()}")
    print(f"  品牌: {Brand.objects.count()}, 门店: {Store.objects.count()}")
    print(f"  装企人员: {DecorationStaff.objects.count()}")
    print(f"  系统用户: {User.objects.count()}")
    print(f"  供货厂家: {Supplier.objects.count()}")
    print(
        f"  木门: {WoodProduct.objects.count()}, 合金门: {AlloyProduct.objects.count()}, 防盗门: {SecurityProduct.objects.count()}"
    )
    print(
        f"  工费标准: {WageStandard.objects.count()}, 工头: {Foreman.objects.count()}, 师傅: {Worker.objects.count()}"
    )
    print(f"  订单: {Order.objects.count()}, 明细: {OrderItem.objects.count()}")
    print(f"  安装任务: {InstallationTask.objects.count()}")
    print(f"  量尺任务: {MeasurementTask.objects.count()}")
    print(f"  维修任务: {MaintenanceTask.objects.count()}")


if __name__ == "__main__":
    main()
