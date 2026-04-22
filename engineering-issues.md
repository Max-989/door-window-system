# 门窗安装管理系统 - 工程化问题与整改建议

> 基于项目实际代码审计输出，2026-04-22
> 严重级别：P0（致命）/ P1（严重）/ P2（一般）/ P3（建议）

---

## 一、API 层问题

### API-01: 登录接口响应格式不统一
- **级别**：P1
- **文件**：`apps/users/views.py` → `login_view`
- **问题**：登录返回 `{token, refresh, user, expires_in}`，没有 `code` 和 `timestamp` 字段，与全局响应格式不一致
- **整改**：
```python
# 修改 login_view 返回格式
from common.responses import success
return success(data={
    "token": token["access"],
    "refresh": token["refresh"],
    "expires_in": 900,
    "user": user_data,
}, message="登录成功")
```

### API-02: 注册接口响应格式不统一
- **级别**：P2
- **文件**：`apps/users/views.py` → `register_decoration`, `register_staff`
- **问题**：注册成功返回 `{message, token}`，错误返回 `{error}`，缺少统一的 code/message/data 格式
- **整改**：统一使用 `common.responses.success()` 和 `error()` 返回

### API-03: 部分视图直接返回 `Response({"error": ...})`
- **级别**：P2
- **文件**：
  - `apps/warehouse/views.py` → `out_stock`, `in_stock` 中的参数校验
  - `apps/products/views.py` → `ProductSearchView` 的错误返回
- **问题**：错误响应用 `"error"` 键而非统一的 `"message"` 键
- **整改**：统一使用 `common.responses.error(message="...")` 返回

### API-04: ProductSearchView 不走标准分页
- **级别**：P2
- **文件**：`apps/products/views.py` → `ProductSearchView`
- **问题**：搜索接口返回 `{code, data: {items}}` 无分页信息，且硬编码 `[:50]` 限制
- **整改**：继承 `ListAPIView` + 配置 `pagination_class = StandardPagination`

### API-05: 权限 API 路由前缀不一致
- **级别**：P3
- **文件**：`config/urls.py`
- **问题**：权限接口在 `/api/permissions/`，其他业务接口在 `/api/v1/`，前缀不统一
- **整改**：统一为 `/api/v1/permissions/`，并更新前端 `permissionStore.ts` 中的 `API_BASE`

---

## 二、认证与权限问题

### AUTH-01: 密码修改无旧密码验证
- **级别**：P1
- **文件**：`apps/users/views.py` → `reset_password`
- **问题**：任何人知道用户手机号就能重置密码（只要传 `phone` 不匹配 `request.user.phone` 才拦截，但 `phone` 参数是可选的）
- **整改**：增加 `old_password` 必填参数验证
```python
old_password = request.data.get("old_password", "")
if not request.user.check_password(old_password):
    return Response({"detail": "原密码错误"}, status=400)
```

### AUTH-02: 前端 refresh token 未使用
- **级别**：P2
- **文件**：`web-admin/src/stores/auth.store.ts`
- **问题**：登录时存储了 `refresh` token，但 `request.ts` 在 401 时直接跳转登录页，没有尝试刷新 token
- **整改**：在 `request.ts` 中增加 token 刷新逻辑：
```typescript
if (res.status === 401) {
  const refreshToken = auth?.state?.refresh
  if (refreshToken) {
    try {
      const newToken = await fetch('/api/v1/users/token/refresh/', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ refresh: refreshToken })
      }).then(r => r.json())
      // 更新 localStorage 中的 token
      localStorage.setItem('auth-storage', JSON.stringify({
        ...auth, state: { ...auth.state, token: newToken.access }
      }))
      return request(url, options) // 重试原请求
    } catch { /* refresh 也失败则跳转登录 */ }
  }
  // 清除登录状态并跳转
}
```

### AUTH-03: PendingUserViewSet 无分页器
- **级别**：P2
- **文件**：`apps/users/views.py` → `PendingUserViewSet`
- **问题**：使用 `self.paginate_queryset(profiles)` 但 ViewSet 未配置 `pagination_class`
- **整改**：在类上添加 `pagination_class = StandardPagination` 或依赖全局配置

### AUTH-04: 权限类 `IsRole` 硬编码角色名
- **级别**：P2
- **文件**：`common/permissions.py`
- **问题**：`allowed_roles = ["admin"]` 等硬编码字符串，与 `permissions.Role` 模型不关联
- **整改**：应使用 `permissions.Role` 的 code 字段做关联，或直接使用 `permissions.RoleMenuPermission` 模型做菜单级权限控制

### AUTH-05: 权限放行策略有安全隐患
- **级别**：P1
- **文件**：`web-admin/src/stores/permissionStore.ts`
- **问题**：`hasPermission` 在 `permissions.length === 0` 时返回 `true`（默认放行）；`hasMenuPermission` 在 `menus.length === 0` 时也返回 `true`
- **整改**：
```typescript
// 权限为空应拒绝访问，除非明确标记为开发模式
hasPermission: (code: string) => {
  const { permissions, initialized } = get()
  if (!initialized) return false
  if (permissions.length === 0) return false  // 改为拒绝
  return permissions.includes(code)
}
```

---

## 三、后端代码规范问题

### BACK-01: `common/utils.py` 与 `common/utils/` 包冲突
- **级别**：P1
- **文件**：`common/utils.py`, `common/utils/`（如存在）
- **问题**：Python 优先使用 `.py` 文件而非同名包，导致 `from common.utils import xxx` 可能失败
- **整改**：按 TOOLS.md 已有方案：重命名 `.py` → `_core.py`，创建 `__init__.py` re-export

### BACK-02: settings merge 覆盖问题（已知风险）
- **级别**：P1
- **文件**：`config/settings/dev.py`
- **问题**：`dev.py` 使用 `REST_FRAMEWORK = {...}` 直接覆盖 `base.py` 的配置，会丢失 `DEFAULT_AUTHENTICATION_CLASSES` 等配置
- **整改**（已在 AGENTS.md 记录）：
```python
from copy import deepcopy
_base_rf = deepcopy(REST_FRAMEWORK)
_base_rf["DEFAULT_RENDERER_CLASSES"] = [...]
REST_FRAMEWORK = _base_rf
```

### BACK-03: 两套 Role 模型
- **级别**：P2
- **文件**：`apps/users/models.py` → `Role`，`apps/permissions/models.py` → `Role`
- **问题**：`users.Role` 和 `permissions.Role` 是两个不同的模型，`db_table` 分别是 `roles` 和 `perm_roles`。`UserProfile.role` FK 指向 `permissions.Role`，`UserViewSet` 又引用 `users.Role`，容易混淆
- **整改**：
  - 方案 A：废弃 `users.Role`，统一使用 `permissions.Role`
  - 方案 B：重命名 `users.Role` → `UserRole`（已废弃标记），明确关系

### BACK-04: 仓库库存操作用 JSONField 记录历史
- **级别**：P2
- **文件**：`apps/warehouse/models.py` → `HardwareInventory.stock_records`, `AccessoryInventory.stock_records`
- **问题**：库存变更历史存储在 JSONField 中，无法高效查询、无法做事务审计、数据量大时性能差
- **整改**：创建独立的 `StockRecord` 模型：
```python
class StockRecord(models.Model):
    item = models.ForeignKey('HardwareInventory', on_delete=models.CASCADE, related_name='records')
    type = models.CharField(choices=[('in','入库'),('out','出库')])
    quantity = models.IntegerField()
    reason = models.CharField(max_length=200)
    operator = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
```

### BACK-05: 订单地址字段无结构化
- **级别**：P3
- **文件**：`apps/orders/models.py` → `Order.customer_address`
- **问题**：客户地址用单个 `CharField` 存储，无法按城市/区域筛选
- **现状**：已通过 `OrderFilterSet.city` 做地址模糊匹配（`icontains`），但不精确
- **整改**：考虑添加 `province`, `city`, `district` 字段或使用 JSONField 结构化存储

### BACK-06: 编码不一致问题（中文注释 GBK 乱码）
- **级别**：P2
- **文件**：多个 `.py` 文件中的中文注释
- **问题**：通过 exec 扫描输出时，中文注释显示为乱码（GBK 编码问题），说明源文件编码可能不统一
- **整改**：确保所有 `.py` 文件顶部有 `# -*- coding: utf-8 -*-` 或使用 UTF-8 BOM（推荐无 BOM UTF-8）

### BACK-07: 枚举值前后端不统一
- **级别**：P1
- **文件**：
  - 后端 `common/enums.py` vs 前端 `types/api.ts`
- **问题**：
  - 后端 `OrderStatus.PENDING = "pending"` vs 前端 `OrderStatus.pending_confirm = 'pending_confirm'`
  - 后端 `MeasurementStatus.PENDING = "pending"` vs 前端 `MeasurementStatus.pending_assign = 'pending_assign'`
  - 后端 `InstallationStatus.PENDING = "pending"` vs 前端 `InstallationStatus.pending_assign = 'pending_assign'`
  - 前端类型定义中的枚举值与后端 `CHOICES` 完全不一致
- **整改**：以 `common/enums.py` 为准，更新前端 `types/api.ts`，或通过 API 自动生成类型

### BACK-08: views.py 中存在重复代码
- **级别**：P2
- **文件**：
  - `apps/warehouse/views.py` → `out_stock` 和 `in_stock` 中的参数校验和库存记录逻辑
- **问题**：出库/入库的参数校验、记录追加、预警判断逻辑高度重复
- **整改**：抽取 `StockService` 类或 mixin：
```python
class StockService:
    @staticmethod
    def validate_stock_params(data):
        quantity = data.get("quantity")
        reason = data.get("reason", "")
        if not quantity or not isinstance(quantity, int) or quantity <= 0:
            raise ValueError("quantity 必须是正整数")
        if not reason:
            raise ValueError("reason 必填")
        return quantity, reason
    
    @staticmethod
    def append_record(item, record_type, quantity, reason, operator, **extra):
        record = {"type": record_type, "quantity": quantity, "reason": reason, 
                  "operator": operator, "created_at": timezone.now().isoformat(), **extra}
        if not item.stock_records:
            item.stock_records = []
        item.stock_records.append(record)
```

---

## 四、前端代码规范问题

### FRONT-01: 侧边栏菜单与路由不匹配
- **级别**：P1
- **文件**：`src/components/Layout/MainLayout.tsx` vs `src/App.tsx`
- **问题**：
  - 侧边栏有 `/app/measurements`、`/app/installations`、`/app/maintenance` 三个独立菜单项
  - 但路由只有一个 `/app/tasks`（`TaskManagement` 组件内部用 Tab 切换）
  - 侧边栏菜单的 `key` 无法匹配到实际路由
- **整改**：统一侧边栏菜单和路由：
  - 方案 A：侧边栏只保留一个"任务管理"菜单项 `/app/tasks`
  - 方案 B：路由拆分为三个独立页面 `/app/measurements`、`/app/installations`、`/app/maintenance`

### FRONT-02: axios 依赖但未使用
- **级别**：P3
- **文件**：`package.json`
- **问题**：`dependencies` 中有 `axios`，但实际使用原生 `fetch` 封装
- **整改**：`npm uninstall axios` 移除无用依赖

### FRONT-03: request.ts 未解包 data 层
- **级别**：P2
- **文件**：`src/utils/request.ts`
- **问题**：根据 TOOLS.md "request.ts 自动解包 data 层，调用方直接拿 `{ items, total }`"，但实际代码中 `request.ts` 直接 `return data`，未做 `data.data` 解包
- **现状**：后端分页响应格式为 `{code, message, data: {items, total}}`，前端需要手动 `data.data.items` 才能拿到数据
- **整改**：
```typescript
export async function request<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  // ... 现有逻辑
  const json = await res.json()
  // 自动解包 data 层
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    return json.data as T
  }
  return json as T
}
```

### FRONT-04: 权限 API 未使用统一 request 方法
- **级别**：P3
- **文件**：`src/stores/permissionStore.ts`
- **问题**：`fetchMenus` 和 `fetchPermissions` 直接使用 `fetch()`，未使用 `request.ts` 封装，缺少统一的错误处理和 token 刷新
- **整改**：改用 `import { get } from '@/utils/request'`

### FRONT-05: TypeScript 类型与后端枚举不同步
- **级别**：P2
- **文件**：`src/types/api.ts`
- **问题**：
  - `UserRole` 定义了 `system_admin`, `admin`, `clerk_wood` 等，但后端用 `permissions.Role` 模型
  - `OrderStatus` 值为 `pending_confirm`，后端是 `pending`
  - 前后端类型定义无自动同步机制
- **整改**：
  - 短期：手动对齐，以后端 `common/enums.py` 为准
  - 长期：使用 `openapi-typescript` 从 Swagger 自动生成类型

### FRONT-06: BaseTable 同时支持服务端/客户端分页导致逻辑复杂
- **级别**：P3
- **文件**：`src/components/BaseTable/index.tsx`
- **问题**：组件内同时处理两种分页模式，增加维护成本。服务端分页应该成为唯一标准
- **整改**：移除客户端分页逻辑，所有列表页统一使用服务端分页

### FRONT-07: 备份文件残留
- **级别**：P3
- **文件**：`src/pages/Orders/OrderCreate.tsx.backup`
- **问题**：`.backup` 文件残留在项目中
- **整改**：删除备份文件，使用 Git 管理版本

### FRONT-08: 无前端测试
- **级别**：P2
- **问题**：项目无任何前端单元测试或集成测试
- **整改**：
  - 引入 Vitest + React Testing Library
  - 优先为 `request.ts`、`auth.store.ts`、`permissionStore.ts` 编写测试

---

## 五、安全与配置问题

### SEC-01: DEBUG = True 在 base.py 中
- **级别**：P1
- **文件**：`config/settings/base.py`
- **问题**：`DEBUG = True` 在基础配置中，所有环境都默认开启 debug
- **整改**：`base.py` 中 `DEBUG = False`，`dev.py` 中覆盖为 `True`

### SEC-02: SECRET_KEY 硬编码
- **级别**：P1
- **文件**：`config/settings/base.py`
- **问题**：`SECRET_KEY` 有不安全的默认值 `"django-insecure-dev-key-change-in-production-xyz"`
- **整改**：生产环境必须通过环境变量注入，且 `base.py` 中不设默认值（启动时明确报错）

### SEC-03: CORS 配置宽松
- **级别**：P2
- **文件**：`config/settings/base.py`
- **问题**：`CORS_ALLOWED_ORIGINS` 允许所有 localhost 端口，生产环境需要收紧
- **整改**：`prod.py` 中只配置实际域名

### SEC-04: 无速率限制差异化
- **级别**：P3
- **文件**：`config/settings/base.py`
- **问题**：登录接口与普通 API 使用相同的速率限制（1000/hour），登录接口应更严格
- **整改**：为登录接口单独配置 throttle：
```python
# views.py
from rest_framework.throttling import AnonRateThrottle
class LoginThrottle(AnonRateThrottle):
    rate = '5/minute'  # 登录限 5 次/分钟
```

---

## 六、数据库问题

### DB-01: SQLite 用于开发，MySQL 用于生产
- **级别**：P2
- **文件**：`config/settings/dev.py`
- **问题**：开发环境用 SQLite，生产用 MySQL，可能存在 SQL 兼容问题（如 JSON 字段查询、日期函数等）
- **整改**：开发环境也使用 MySQL（Docker 本地实例），或至少在 CI 中使用 MySQL 测试

### DB-02: 无数据库迁移版本管理检查
- **级别**：P3
- **问题**：已有 `makemigrations --merge` 处理冲突的记录，说明迁移管理不够规范
- **整改**：确保迁移文件按顺序提交，CI 中检查迁移是否完整

### DB-03: 缺少索引优化
- **级别**：P3
- **问题**：`Order.customer_address` 用于城市筛选（`icontains`），`CharField` 上的 `icontains` 无法使用索引
- **整改**：拆分地址字段或添加单独的 `city` 字段

---

## 七、文档与代码质量

### DOC-01: Swagger 文档联系信息为占位符
- **级别**：P3
- **文件**：`config/urls.py`
- **问题**：`contact@example.com`, `https://www.example.com/terms/` 等占位符
- **整改**：替换为实际信息

### DOC-02: 部分文件缺少 docstring
- **级别**：P3
- **问题**：前端组件、部分后端视图缺少文档字符串
- **整改**：至少为公共 API 端点编写 docstring（Swagger 会读取）

---

## 八、问题统计

| 级别 | 数量 | 说明 |
|------|------|------|
| P0（致命） | 0 | 无阻塞性问题 |
| P1（严重） | 7 | 需要优先修复 |
| P2（一般） | 14 | 应尽快处理 |
| P3（建议） | 10 | 可安排迭代优化 |

### P1 问题清单（优先修复）

| 编号 | 问题 | 模块 |
|------|------|------|
| API-01 | 登录响应格式不统一 | API 层 |
| AUTH-01 | 密码修改无旧密码验证 | 认证 |
| AUTH-05 | 权限放行策略有安全隐患 | 前端权限 |
| BACK-01 | utils.py 包冲突风险 | 后端配置 |
| BACK-02 | settings merge 覆盖 | 后端配置 |
| BACK-07 | 枚举值前后端不统一 | 全栈 |
| FRONT-01 | 侧边栏菜单与路由不匹配 | 前端路由 |
| SEC-01 | DEBUG=True 在 base.py | 安全配置 |
| SEC-02 | SECRET_KEY 硬编码 | 安全配置 |

### 推荐修复顺序

1. **SEC-01 + SEC-02**：安全配置，最紧急
2. **BACK-07**：前后端枚举同步，影响所有状态展示
3. **FRONT-01**：路由/菜单匹配，影响用户体验
4. **API-01 + BACK-02**：响应格式统一，影响前端适配
5. **AUTH-01 + AUTH-05**：认证安全加固
6. **BACK-01**：utils 冲突预防
