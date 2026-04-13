"""
枚举定义 - 按需求文档重写
"""


class UserStatus:
    """用户状态"""

    ACTIVE = "active"
    RESIGNED = "resigned"
    DISABLED = "disabled"
    CHOICES = [
        (ACTIVE, "在职"),
        (RESIGNED, "离职"),
        (DISABLED, "禁用"),
    ]


class UserIdentity:
    """用户身份 - 装企/乙方/客户"""

    DECORATION = "decoration"
    CONTRACTOR = "contractor"
    CUSTOMER = "customer"
    CHOICES = [
        (DECORATION, "装企"),
        (CONTRACTOR, "乙方"),
        (CUSTOMER, "客户"),
    ]


class UserRole:
    """系统用户角色（乙方内部）- 已废弃，改用 permissions.Role"""

    CLERK = "clerk"
    WAREHOUSE = "warehouse"
    MEASURER = "measurer"
    INSTALLER = "installer"
    REPAIRMAN = "repairman"
    FOREMAN = "foreman"
    CHOICES = [
        (CLERK, "文员"),
        (WAREHOUSE, "仓库人员"),
        (MEASURER, "量尺师傅"),
        (INSTALLER, "安装师傅"),
        (REPAIRMAN, "维修师傅"),
        (FOREMAN, "工头"),
    ]


class ProductLine:
    """产品线"""

    WOOD = "wood"
    ALLOY = "alloy"
    SECURITY = "security"
    CHOICES = [
        (WOOD, "木门"),
        (ALLOY, "合金门"),
        (SECURITY, "防盗门"),
    ]


class OrderStatus:
    """订单状态 - 10个状态"""

    PENDING = "pending"  # 待确认
    CONFIRMED = "confirmed"  # 已确认
    PRODUCED = "produced"  # 已生产（生产完成）
    SHIPPED = "shipped"  # 已发货
    ARRIVED = "arrived"  # 已到货
    DELIVERED = "delivered"  # 已派送
    INSTALLING = "installing"  # 安装中
    COMPLETED = "completed"  # 已完成
    CANCELLED = "cancelled"  # 已取消
    CLOSED = "closed"  # 已关闭
    CHOICES = [
        (PENDING, "待确认"),
        (CONFIRMED, "已确认"),
        (PRODUCED, "已生产"),
        (SHIPPED, "已发货"),
        (ARRIVED, "已到货"),
        (DELIVERED, "已派送"),
        (INSTALLING, "安装中"),
        (COMPLETED, "已完成"),
        (CANCELLED, "已取消"),
        (CLOSED, "已关闭"),
    ]


class OrderSource:
    """订单来源"""

    BRAND_STORE = "brand_store"  # 装企品牌门店
    DIRECT = "direct"  # 直单
    DIRECT_TASK = "direct_task"  # 直接任务（无订单）
    DIRECT_INSTALLATION = "direct_installation"  # 直接安装任务
    INDEPENDENT = "independent"  # 独立创建（售后单等）
    ORDER = "order"  # 从订单创建
    INSTALLATION = "installation"  # 从安装单创建
    CHOICES = [
        (BRAND_STORE, "品牌门店"),
        (DIRECT, "直单"),
        (DIRECT_TASK, "直接任务"),
        (DIRECT_INSTALLATION, "直接安装任务"),
        (INDEPENDENT, "独立创建"),
        (ORDER, "从订单创建"),
        (INSTALLATION, "从安装单创建"),
    ]


class OrderType:
    """订单类型"""

    MAIN = "main"  # 主单
    SUPPLEMENT = "supplement"  # 补单
    AFTER_SALE = "after_sale"  # 售后
    CHOICES = [
        (MAIN, "主单"),
        (SUPPLEMENT, "补单"),
        (AFTER_SALE, "售后"),
    ]


class MeasurementStatus:
    """量尺状态 - 4个"""

    PENDING = "pending"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CHOICES = [
        (PENDING, "待派单"),
        (ASSIGNED, "已派单"),
        (COMPLETED, "已完成"),
        (CANCELLED, "已取消"),
    ]


class InstallationStatus:
    """安装状态 - 含部分完成"""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"
    CHOICES = [
        (PENDING, "待派单"),
        (ASSIGNED, "已派单"),
        (IN_PROGRESS, "进行中"),
        (COMPLETED, "已完成"),
        (CANCELLED, "已取消"),
        (PARTIAL, "部分完成"),
    ]


class MaintenanceStatus:
    """维修状态 - 含部分完成"""

    PENDING = "pending"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PARTIAL = "partial"
    CHOICES = [
        (PENDING, "待派单"),
        (ASSIGNED, "已派单"),
        (COMPLETED, "已完成"),
        (CANCELLED, "已取消"),
        (PARTIAL, "部分完成"),
    ]


class MaintenanceResponsibility:
    """维修责任判定"""

    FACTORY = "factory"
    LOGISTICS = "logistics"
    INSTALLATION = "installation"
    MEASUREMENT = "measurement"
    DELIVERY = "delivery"
    SITE = "site"
    NONE = "none"
    CHOICES = [
        (FACTORY, "工厂"),
        (LOGISTICS, "物流"),
        (INSTALLATION, "安装"),
        (MEASUREMENT, "量尺"),
        (DELIVERY, "送货"),
        (SITE, "工地"),
        (NONE, "无责任"),
    ]


class ProductStatus:
    """产品状态"""

    ON_SALE = "on_sale"
    OFF_SALE = "off_sale"
    PRE_SALE = "pre_sale"
    CHOICES = [(ON_SALE, "在售"), (OFF_SALE, "停售"), (PRE_SALE, "预售")]


class WoodSurfaceProcess:
    """木门表面工艺"""

    PAINT = "paint"
    BARE = "bare"
    CHOICES = [(PAINT, "油漆"), (BARE, "免漆")]


class AlloyOpenMethod:
    """合金门开启方式"""

    SWING = "swing"
    SINGLE_SLIDE = "single_slide"
    DOUBLE_SLIDE = "double_slide"
    TRIPLE_SLIDE = "triple_slide"
    CHOICES = [
        (SWING, "平开门"),
        (SINGLE_SLIDE, "单推"),
        (DOUBLE_SLIDE, "双推"),
        (TRIPLE_SLIDE, "三推"),
    ]


class AlloyTrackType:
    """轨道类型"""

    OVERHEAD = "overhead"
    FLOOR = "floor"
    CHOICES = [(OVERHEAD, "吊轨"), (FLOOR, "地轨")]


class GlassType:
    """玻璃类型"""

    SINGLE = "single"
    DOUBLE = "double"
    CHOICES = [(SINGLE, "单玻"), (DOUBLE, "双玻")]


class SecurityOpenMethod:
    """防盗门开启方式"""

    SINGLE = "single"
    DOUBLE = "double"
    CHOICES = [(SINGLE, "单开"), (DOUBLE, "双开")]


class SecurityOpenDirection:
    """防盗门开门方向"""

    OL = "outer_left"
    OR = "outer_right"
    IL = "inner_left"
    IR = "inner_right"
    CHOICES = [
        (OL, "外左"),
        (OR, "外右"),
        (IL, "内左"),
        (IR, "内右"),
    ]


class SecuritySizeType:
    """防盗门尺寸类型"""

    STANDARD = "standard"
    CUSTOM = "custom"
    CHOICES = [(STANDARD, "标尺"), (CUSTOM, "定制")]


class HardwareType:
    """五金类型"""

    LOCK = "lock"
    HINGE = "hinge"
    OTHER = "other"
    CHOICES = [(LOCK, "锁具"), (HINGE, "合页"), (OTHER, "其他")]


class HardwareSubType:
    """五金子类型"""

    MECHANICAL_LOCK = "mechanical_lock"
    SMART_LOCK = "smart_lock"
    MOTHER_CHILD_HINGE = "mother_child_hinge"
    OTHER = "other"
    CHOICES = [
        (MECHANICAL_LOCK, "机械锁"),
        (SMART_LOCK, "智能锁"),
        (MOTHER_CHILD_HINGE, "子母合页"),
        (OTHER, "其他"),
    ]


class DecorationStaffRole:
    """装企人员角色"""

    PROJECT_MANAGER = "project_manager"
    SALES_GUIDE = "sales_guide"
    CHOICES = [
        (PROJECT_MANAGER, "项目经理"),
        (SALES_GUIDE, "导购"),
    ]


class SupplierStatus:
    """供货厂家状态"""

    COOPERATING = "cooperating"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    CHOICES = [
        (COOPERATING, "合作中"),
        (SUSPENDED, "已暂停"),
        (TERMINATED, "已终止"),
    ]


class DecorationStatus:
    """装企状态"""

    COOPERATING = "cooperating"
    PAUSED = "paused"
    TERMINATED = "terminated"
    CHOICES = [(COOPERATING, "合作中"), (PAUSED, "已暂停"), (TERMINATED, "已终止")]


class WarehouseProductStatus:
    """产品流转仓状态"""

    PENDING_SHIP = "pending_ship"
    SHIPPED = "shipped"
    ARRIVED = "arrived"
    PENDING_DELIVER = "pending_deliver"
    DELIVERED = "delivered"
    CHOICES = [
        (PENDING_SHIP, "待发货"),
        (SHIPPED, "已发货"),
        (ARRIVED, "已到货"),
        (PENDING_DELIVER, "待派送"),
        (DELIVERED, "已派送"),
    ]


class PendingGoodsMatchStatus:
    """货品暂存匹配状态"""

    UNMATCHED = "unmatched"
    MATCHED = "matched"
    CHOICES = [(UNMATCHED, "未匹配"), (MATCHED, "已匹配")]


class WorkerSkillType:
    """师傅技能类型"""

    MEASUREMENT = "measurement"
    INSTALLATION = "installation"
    MAINTENANCE = "maintenance"
    DELIVERY = "delivery"
    CHOICES = [
        (MEASUREMENT, "量尺"),
        (INSTALLATION, "安装"),
        (MAINTENANCE, "维修"),
        (DELIVERY, "送货"),
    ]


class WageBillingType:
    """工费计费方式"""

    PER_TIME = "per_time"
    PER_DOOR = "per_door"
    PER_PIECE = "per_piece"
    CHOICES = [
        (PER_TIME, "按次"),
        (PER_DOOR, "按门数量"),
        (PER_PIECE, "按樘"),
    ]


class ContractMode:
    """承包模式"""

    SERVICE_CONTRACTOR = "service_contractor"
    PERSONAL = "personal"
    CHOICES = [
        (SERVICE_CONTRACTOR, "服务承包商"),
        (PERSONAL, "个人承包"),
    ]


class NotificationType:
    """通知类型"""

    ORDER_UPDATE = "order_update"
    TASK_ASSIGNED = "task_assigned"
    MEASUREMENT_RESULT = "measurement_result"
    MAINTENANCE = "maintenance"
    SYSTEM = "system"
    INVENTORY_ALERT = "inventory_alert"
    CHOICES = [
        (ORDER_UPDATE, "订单更新"),
        (TASK_ASSIGNED, "任务分配"),
        (MEASUREMENT_RESULT, "量尺结果"),
        (MAINTENANCE, "维修通知"),
        (SYSTEM, "系统通知"),
        (INVENTORY_ALERT, "库存预警"),
    ]
