/// <summary>
/// API 类型定义
/// </summary>

// 用户角色
export type UserRole =
  | 'system_admin'      // 系统管理员
  | 'admin'             // 管理员
  | 'clerk_wood'        // 文员-木门
  | 'clerk_alloy'       // 文员-合金门
  | 'clerk_security'    // 文员-防盗门
  | 'clerk'             // 文员（通用）
  | 'warehouse'         // 仓库人员（含送货师傅）
  | 'measurer'          // 量尺师傅
  | 'installer'         // 安装师傅
  | 'repairman'         // 维修师傅
  | 'foreman'           // 工头
  | 'service_personnel' // 现场服务人员
  | 'project_manager'   // 项目经理
  | 'sales_guide'       // 导购

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'disabled'

// 产品线类型
export type ProductLine = 'wood' | 'alloy' | 'security'

// 订单状态
export type OrderStatus =
  | 'pending'   // 待确认
  | 'confirmed' // 已确认
  | 'produced'  // 已生产
  | 'shipped'   // 已发货
  | 'arrived'   // 已到货
  | 'delivered' // 已派送
  | 'installing' // 安装中
  | 'completed' // 已完成
  | 'cancelled' // 已取消
  | 'closed'    // 已关闭

// 量尺状态
export type MeasurementStatus =
  | 'pending'    // 待派单
  | 'assigned'   // 已派单
  | 'completed'  // 已完成
  | 'cancelled'  // 已取消

// 安装状态
export type InstallationStatus =
  | 'pending'      // 待派单
  | 'assigned'     // 已派单
  | 'in_progress'  // 进行中
  | 'completed'    // 已完成
  | 'cancelled'    // 已取消
  | 'partial'      // 部分完成

// 维修状态
export type MaintenanceStatus =
  | 'pending'    // 待派单
  | 'assigned'          // 已派单
  | 'completed'         // 已完成
  | 'cancelled'         // 已取消
  | 'partial'           // 部分完成

// 维修责任方
export type RepairResponsibility =
  | 'factory'           // 工厂
  | 'logistics'         // 物流
  | 'installation'      // 安装
  | 'measurement'       // 量尺
  | 'delivery'          // 送货
  | 'construction'      // 工地

// 师傅技能类型
export type WorkerSkill = 'measurement' | 'installation' | 'repair' | 'delivery'

// 订单来源类型
export type OrderSource = 'brand_store' | 'direct' | 'direct_task'

// 通用分页参数
export interface PaginationParams {
  page: number
  pageSize: number
}

// 通用分页响应
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 用户身份类型
export type UserIdentity = 'decoration' | 'customer' | 'contractor' | 'system'

// 角色选项
export interface RoleOption {
  role_id: number
  role_name: string
}

// 用户信息
export interface User {
  id: number
  username: string
  name: string
  phone: string
  role: UserRole
  identity: UserIdentity
  is_approved: boolean
  status: UserStatus
  roles?: RoleOption[]          // 可选角色列表（多角色用户）
  productLine?: ProductLine     // 文员所属产品线
  branch?: string                // 所属分公司
  avatar?: string
  createdAt: string
  updatedAt: string
}

// 登录请求
export interface LoginRequest {
  phone: string
  password: string
}

// 登录响应
export interface LoginResponse {
  token: string
  refresh: string
  user: User
  expiresIn?: number
}

// 订单
export interface Order {
  id: number
  orderNo: string
  source: OrderSource
  branch: string
  brand?: string
  store?: string
  salesperson?: string
  customerName: string
  customerPhone: string
  customerAddress: string
  status: OrderStatus
  productionStatus?: string
  totalAmount: number
  costAmount: number
  productItems: OrderProductItem[]
  remark?: string
  relatedMeasurements?: string[]
  productLine?: ProductLine
  createdAt: string
  updatedAt: string
}

// 订单产品明细
export interface OrderProductItem {
  id: number
  productType: ProductLine
  productName: string
  model?: string
  specs: string
  quantity: number
  unitPrice: number
  totalPrice: number
  supplier?: string
}

// 量尺任务
export interface MeasurementTask {
  id: number
  taskNo: string
  source: OrderSource
  branch: string
  brand?: string
  store?: string
  creatorName: string
  creatorPhone: string
  customerName: string
  customerPhone: string
  customerAddress: string
  status: MeasurementStatus
  assignedWorker?: string
  assignedWorkerPhone?: string
  photos?: string[]
  productItems: string[]
  remark?: string
  completedAt?: string
  createdAt: string
}

// 安装任务
export interface InstallationTask {
  id: number
  taskNo: string
  relatedOrderNo?: string
  branch: string
  customerName: string
  customerPhone: string
  customerAddress: string
  status: InstallationStatus
  assignedWorkers: string[]
  measurementPhotos?: string[]
  deliveryPhotos?: string[]
  installationPhotos?: string[]
  extraItems?: ExtraItem[]
  remark?: string
  completedAt?: string
  createdAt: string
}

// 增项
export interface ExtraItem {
  description: string
  amount: number
}

// 维修任务
export interface MaintenanceTask {
  id: number
  taskNo: string
  relatedOrderNo?: string
  branch: string
  brand?: string
  store?: string
  creatorName: string
  customerName: string
  customerPhone: string
  customerAddress: string
  problemDescription: string
  status: MaintenanceStatus
  assignedWorker?: string
  responsibility?: RepairResponsibility
  photos?: string[]
  videos?: string[]
  remark?: string
  completedAt?: string
  createdAt: string
}

// 服务师傅
export interface Worker {
  id: number
  name: string
  phone: string
  wechat?: string
  bankCard?: string
  skills: WorkerSkill[]
  foremanId?: number
  foremanName?: string
  branch: string
  city: string
  status: 'active' | 'inactive' | 'disabled'
  wageStandards: WageStandard[]
  createdAt: string
}

// 工费标准
export interface WageStandard {
  skill: WorkerSkill
  type: 'per_time' | 'per_door'
  unitPrice: number
  productType?: string
}

// 品牌
export interface Brand {
  id: number
  name: string
  contactPerson?: string
  contactPhone?: string
  status: 'cooperating' | 'suspended' | 'terminated'
  createdAt: string
}

// 门店
export interface Store {
  id: number
  brandId: number
  brandName: string
  name: string
  address: string
  city: string
  area: string
  status: 'cooperating' | 'suspended' | 'terminated'
  createdAt: string
}

// 装企人员
export interface DecorationStaff {
  id: number
  storeId: number
  storeName: string
  name: string
  phone: string
  wechat?: string
  role: 'project_manager' | 'sales_guide'
  status: 'active' | 'inactive'
  createdAt: string
}

// 仓库产品流转
export interface WarehouseProduct {
  id: number
  orderNo: string
  productType: ProductLine
  model: string
  lockModel?: string
  quantity: number
  status: string
  trackingNo?: string
  pickupTime?: string
  deliveryPhotos?: string[]
  operator: string
  createdAt: string
  city?: string
}

// 五金库存
export interface HardwareInventory {
  id: number
  name: string
  type: string
  currentStock: number
  warningLevel: number
  purchasing: number
  pendingDemand: number
  availableStock: number
}

// 配件库存
export interface AccessoryInventory {
  id: number
  name: string
  model: string
  currentStock: number
  purchasing: number
}

// 货品暂存
export interface PendingGoods {
  id: number
  name: string
  model: string
  doorType: ProductLine
  specs: string
  color: string
  otherConfig?: string
  inboundTime: string
  inboundReason: string
  matchStatus: 'pending' | 'matched' | 'unmatched'
  matchedOrderNo?: string
}

// 产品库 - 木门
export interface WoodProduct {
  id: number
  name: string
  surfaceProcess: 'paint' | 'paint_free'
  model: string
  colors: string[]
  supplier: string
  costPrice: number
  image?: string
  status: 'on_sale' | 'off_sale' | 'presale'
}

// 产品库 - 合金门
export interface AlloyProduct {
  id: number
  name: string
  openType: 'casement' | 'single_slide' | 'double_slide' | 'triple_slide'
  trackType?: 'overhead' | 'floor'
  profile?: string
  colors: string[]
  glassType: 'single' | 'double'
  glassKind?: string
  supplier: string
  pricingMethod: 'area' | 'base_plus_glass'
  unitPrice?: number
  oversizeFee?: number
  glassPrice?: number
  image?: string
  status: 'on_sale' | 'off_sale' | 'presale'
}

// 产品库 - 防盗门
export interface SecurityProduct {
  id: number
  name: string
  model: string
  doorColors: string[]
  openType: 'single' | 'double'
  openDirection?: string
  sizeType: 'standard' | 'custom'
  standardSizes?: string[]
  frameType?: string
  lockModel?: string
  smartLockModel?: string
  smartLockExtraPrice?: number
  standardPrice: number
  customPrice: number
  supplier: string
  image?: string
  status: 'on_sale' | 'off_sale' | 'presale'
}

// 五金配件
export interface Hardware {
  id: number
  name: string
  type: 'lock' | 'hinge' | 'other'
  subType: string
  model: string
  applicableProducts: ProductLine[]
  supplier: string
  costPrice: number
  image?: string
  status: 'on_sale' | 'off_sale' | 'presale'
}

// 供货厂家
export interface Supplier {
  id: number
  name: string
  productTypes: ProductLine[]
  contactPerson?: string
  contactPhone?: string
  address?: string
  status: 'cooperating' | 'suspended' | 'terminated'
}

export const STATUS_LABELS: Record<string, string> = {
  // 订单
  pending_confirm: '待确认',
  confirmed: '已确认',
  in_production: '生产中',
  shipped: '已发货',
  arrived: '已到货',
  delivered: '已派送',
  installing: '安装中',
  completed: '已完成',
  cancelled: '已取消',
  closed: '已关闭',
  // 任务通用
  pending_assign: '待派单',
  assigned: '已派单',
  partial: '部分完成',
  // 装企品牌/门店状态
  cooperating: '合作中',
  suspended: '已暂停',
  terminated: '已终止',
  // 产品状态
  on_sale: '在售',
  off_sale: '停售',
  presale: '预售',
  // 人员
  active: '在职',
  inactive: '离职',
  disabled: '禁用',
}

// 状态颜色映射
export const STATUS_COLORS: Record<string, string> = {
  pending_confirm: 'orange',
  confirmed: 'blue',
  in_production: 'processing',
  shipped: 'cyan',
  arrived: 'geekblue',
  delivered: 'purple',
  installing: 'blue',
  completed: 'green',
  cancelled: 'default',
  closed: 'default',
  pending_assign: 'orange',
  assigned: 'blue',
  partial: 'warning',
  cooperating: 'green',
  suspended: 'orange',
  terminated: 'red',
  on_sale: 'green',
  off_sale: 'default',
  presale: 'blue',
  active: 'green',
  inactive: 'default',
  disabled: 'red',
  // 新订单状态 (API field: order_status)
  pending: 'blue',
  producing: 'orange',
  produced: 'orange',
}

// 订单状态标签颜色（用于流转仓等场景，更细粒度）
export const ORDER_STATUS_TAG: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'blue' },
  confirmed: { label: '已确认', color: 'blue' },
  produced: { label: '已生产', color: 'orange' },
  shipped: { label: '已发货', color: 'cyan' },
  arrived: { label: '已到货', color: 'geekblue' },
  delivered: { label: '已派送', color: 'purple' },
  installing: { label: '安装中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
  closed: { label: '已关闭', color: 'default' },
}
