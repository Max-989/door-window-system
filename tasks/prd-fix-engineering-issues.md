# PRD: 门窗安装管理系统工程问题修复

## Introduction

基于工程化问题审计文档（engineering-issues.md），修复门窗安装管理系统的31个工程问题，包括API响应格式不统一、认证安全漏洞、前后端枚举不同步、代码规范问题、安全配置问题等。修复遵循最小迭代原则，每个修复任务小到可在一个会话中完成，确保代码质量、安全性和可维护性。

## Goals

- 修复所有P1级别严重问题（7个），消除安全隐患和阻塞性问题
- 修复P2级别一般问题（14个），提升代码质量和一致性
- 修复P3级别建议问题（10个），优化开发体验和文档
- 确保所有修复遵循工程规范文档（工程规范文档.md）的规范
- 为关键修复添加测试验证，确保不引入回归问题
- 更新相关文档，保持文档与实际代码同步

## User Stories

### US-001: 修复安全配置问题（SEC-01、SEC-02）
**Description:** 作为系统管理员，我需要修复基础安全配置，确保生产环境安全，防止调试信息泄露和密钥硬编码风险。

**Acceptance Criteria:**
- [ ] 将 `config/settings/base.py` 中的 `DEBUG = True` 改为 `DEBUG = False`
- [ ] 在 `config/settings/dev.py` 中设置 `DEBUG = True`
- [ ] 移除 `config/settings/base.py` 中硬编码的 `SECRET_KEY` 默认值
- [ ] 确保 `SECRET_KEY` 必须通过环境变量 `DJANGO_SECRET_KEY` 注入
- [ ] 启动时缺少 `SECRET_KEY` 会明确报错
- [ ] 后端测试通过（`make test`）
- [ ] 开发环境和生产环境配置分离验证

### US-002: 修复前后端枚举值不同步（BACK-07）
**Description:** 作为开发人员，我需要统一前后端枚举值定义，确保订单状态、任务状态等枚举值前后端一致，避免状态展示错误。

**Acceptance Criteria:**
- [ ] 以后端 `common/enums.py` 为准，更新前端 `src/types/api.ts` 中的枚举定义
- [ ] 对齐 `OrderStatus`（后端 `pending` vs 前端 `pending_confirm`）
- [ ] 对齐 `MeasurementStatus`（后端 `pending` vs 前端 `pending_assign`）
- [ ] 对齐 `InstallationStatus`（后端 `pending` vs 前端 `pending_assign`）
- [ ] 对齐 `UserRole` 与 `permissions.Role` 模型
- [ ] 更新所有使用枚举值的前端组件
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功（`npm run build`）

### US-003: 修复侧边栏菜单与路由不匹配（FRONT-01）
**Description:** 作为用户，我需要侧边栏菜单能正确导航到对应页面，确保菜单项和实际路由匹配，提升用户体验。

**Acceptance Criteria:**
- [ ] 方案A：侧边栏只保留一个"任务管理"菜单项 `/app/tasks`
- [ ] 或方案B：路由拆分为三个独立页面 `/app/measurements`、`/app/installations`、`/app/maintenance`
- [ ] 更新 `src/components/Layout/MainLayout.tsx` 中的菜单配置
- [ ] 更新 `src/App.tsx` 中的路由配置
- [ ] 确保菜单点击能正确导航到对应页面
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-004: 修复登录接口响应格式不统一（API-01）
**Description:** 作为开发人员，我需要统一登录接口的响应格式，使其符合全局响应格式规范，确保前端能正确处理登录响应。

**Acceptance Criteria:**
- [ ] 修改 `apps/users/views.py` 中的 `login_view` 函数
- [ ] 使用 `common.responses.success()` 返回统一格式响应
- [ ] 响应包含 `code`、`message`、`data`、`timestamp` 字段
- [ ] `data` 中包含 `token`、`refresh`、`expires_in`、`user` 字段
- [ ] 保持现有登录功能不变
- [ ] 后端测试通过（`make test`）
- [ ] 前端登录功能测试验证

### US-005: 修复 settings merge 覆盖问题（BACK-02）
**Description:** 作为开发人员，我需要修复 settings 配置合并问题，确保 `dev.py` 不会覆盖 `base.py` 中的重要配置如 `DEFAULT_AUTHENTICATION_CLASSES`。

**Acceptance Criteria:**
- [ ] 修改 `config/settings/dev.py` 中的 `REST_FRAMEWORK` 配置
- [ ] 使用 `deepcopy` 复制 `base.py` 的配置再修改
- [ ] 确保 `DEFAULT_AUTHENTICATION_CLASSES` 等关键配置不被覆盖
- [ ] 验证开发服务器能正常启动
- [ ] 验证 JWT 认证功能正常
- [ ] 后端测试通过

### US-006: 修复密码修改无旧密码验证（AUTH-01）
**Description:** 作为用户，我需要密码修改功能验证旧密码，防止任何人知道手机号就能重置密码的安全漏洞。

**Acceptance Criteria:**
- [ ] 修改 `apps/users/views.py` 中的 `reset_password` 函数
- [ ] 增加 `old_password` 必填参数验证
- [ ] 使用 `request.user.check_password(old_password)` 验证旧密码
- [ ] 旧密码错误时返回 `{"detail": "原密码错误"}`，状态码 400
- [ ] 更新前端密码修改表单，添加旧密码字段
- [ ] 后端测试通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-007: 修复权限放行策略安全隐患（AUTH-05）
**Description:** 作为系统管理员，我需要修复权限检查逻辑，确保权限为空时拒绝访问而非默认放行，防止未授权访问。

**Acceptance Criteria:**
- [ ] 修改 `src/stores/permissionStore.ts` 中的 `hasPermission` 函数
- [ ] 当 `permissions.length === 0` 时返回 `false`（拒绝访问）
- [ ] 修改 `hasMenuPermission` 函数，当 `menus.length === 0` 时返回 `false`
- [ ] 确保 `initialized` 检查保留
- [ ] 更新 `PermissionRoute` 组件处理拒绝访问的逻辑
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-008: 修复 utils.py 包冲突风险（BACK-01）
**Description:** 作为开发人员，我需要解决 `common/utils.py` 与 `common/utils/` 包冲突问题，防止导入失败。

**Acceptance Criteria:**
- [ ] 重命名 `common/utils.py` → `common/utils_core.py`
- [ ] 创建 `common/utils/__init__.py` 重新导出必要函数
- [ ] 更新所有导入 `common.utils` 的代码
- [ ] 确保所有导入正常工作
- [ ] 运行 `make lint` 和 `make format` 检查代码质量
- [ ] 后端测试通过

### US-009: 修复注册接口响应格式不统一（API-02）
**Description:** 作为开发人员，我需要统一注册接口的响应格式，使其符合全局响应格式规范。

**Acceptance Criteria:**
- [ ] 修改 `apps/users/views.py` 中的 `register_decoration` 和 `register_staff` 函数
- [ ] 统一使用 `common.responses.success()` 和 `error()` 返回
- [ ] 注册成功返回统一格式 `{code:200, message:"注册成功", data:{...}}`
- [ ] 错误返回统一格式 `{code:400, message:"错误信息", errors:[...]}`
- [ ] 更新前端注册页面的错误处理逻辑
- [ ] 后端测试通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-010: 修复部分视图直接返回非标准错误响应（API-03）
**Description:** 作为开发人员，我需要修复部分视图直接返回 `{"error": ...}` 而非标准错误响应的问题。

**Acceptance Criteria:**
- [ ] 修复 `apps/warehouse/views.py` 中的 `out_stock`、`in_stock` 函数
- [ ] 修复 `apps/products/views.py` 中的 `ProductSearchView` 错误返回
- [ ] 统一使用 `common.responses.error(message="...")` 返回
- [ ] 确保错误响应格式为 `{code:400, message:"错误信息", errors:[...]}`
- [ ] 更新相关前端错误处理
- [ ] 后端测试通过

### US-011: 修复 ProductSearchView 不走标准分页（API-04）
**Description:** 作为开发人员，我需要修复产品搜索接口的分页问题，使其使用标准分页器，支持分页参数。

**Acceptance Criteria:**
- [ ] 修改 `apps/products/views.py` 中的 `ProductSearchView`
- [ ] 继承 `ListAPIView` 或配置 `pagination_class = StandardPagination`
- [ ] 移除硬编码的 `[:50]` 限制
- [ ] 支持 `page` 和 `pageSize` 分页参数
- [ ] 返回标准分页格式 `{items:[...], total:100, page:1, pageSize:20}`
- [ ] 更新前端产品搜索组件支持分页
- [ ] 后端测试通过

### US-012: 修复前端 refresh token 未使用（AUTH-02）
**Description:** 作为用户，我需要前端在 token 过期时自动刷新，而不是直接跳转登录页，提升用户体验。

**Acceptance Criteria:**
- [ ] 修改 `src/utils/request.ts`，增加 token 刷新逻辑
- [ ] 在 401 响应时检查是否存在 refresh token
- [ ] 调用 `/api/v1/users/token/refresh/` 接口刷新 token
- [ ] 更新 `localStorage` 中的 token 并重试原请求
- [ ] 刷新失败时跳转登录页
- [ ] 确保 refresh token 轮换逻辑正常
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-013: 修复 PendingUserViewSet 无分页器（AUTH-03）
**Description:** 作为管理员，我需要待审批用户列表支持分页，防止数据量过大时页面加载缓慢。

**Acceptance Criteria:**
- [ ] 修改 `apps/users/views.py` 中的 `PendingUserViewSet`
- [ ] 添加 `pagination_class = StandardPagination`
- [ ] 或确保全局分页配置生效
- [ ] 确保 `self.paginate_queryset(profiles)` 正常工作
- [ ] 更新前端审批页面支持分页
- [ ] 后端测试通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-014: 修复权限类 IsRole 硬编码角色名（AUTH-04）
**Description:** 作为开发人员，我需要修复权限类中硬编码的角色名，使其与 `permissions.Role` 模型关联。

**Acceptance Criteria:**
- [ ] 修改 `common/permissions.py` 中的 `IsRole` 类
- [ ] 使用 `permissions.Role` 的 `code` 字段做关联
- [ ] 或直接使用 `permissions.RoleMenuPermission` 模型做菜单级权限控制
- [ ] 更新使用 `IsRole` 的视图
- [ ] 确保权限检查逻辑正确
- [ ] 后端测试通过

### US-015: 修复仓库库存操作用 JSONField 记录历史（BACK-04）
**Description:** 作为仓库管理员，我需要库存变更历史使用独立模型存储，便于查询和审计。

**Acceptance Criteria:**
- [ ] 创建 `StockRecord` 模型，包含 `item`、`type`、`quantity`、`reason`、`operator`、`created_at` 字段
- [ ] 更新 `apps/warehouse/models.py`，移除 `HardwareInventory.stock_records` 和 `AccessoryInventory.stock_records`
- [ ] 修改 `out_stock` 和 `in_stock` 视图，使用 `StockRecord` 模型
- [ ] 生成并运行数据库迁移
- [ ] 迁移现有 JSON 数据到新模型（可选）
- [ ] 后端测试通过

### US-016: 修复视图重复代码问题（BACK-08）
**Description:** 作为开发人员，我需要提取仓库出库入库的重复代码，提高代码复用性和可维护性。

**Acceptance Criteria:**
- [ ] 创建 `StockService` 类或 mixin
- [ ] 抽取参数校验逻辑到 `validate_stock_params` 方法
- [ ] 抽取记录追加逻辑到 `append_record` 方法
- [ ] 更新 `out_stock` 和 `in_stock` 视图使用 `StockService`
- [ ] 确保功能不变
- [ ] 运行 `make lint` 和 `make format` 检查代码质量
- [ ] 后端测试通过

### US-017: 修复 axios 依赖但未使用（FRONT-03）
**Description:** 作为开发人员，我需要移除未使用的 axios 依赖，减少包体积和依赖复杂度。

**Acceptance Criteria:**
- [ ] 运行 `npm uninstall axios` 移除依赖
- [ ] 更新 `package.json` 和 `package-lock.json`
- [ ] 确保没有代码引用 `axios`
- [ ] 前端构建成功（`npm run build`）
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-018: 修复 request.ts 未解包 data 层（FRONT-03）
**Description:** 作为开发人员，我需要修复 request.ts 的响应解包逻辑，使调用方直接拿到 `{items, total}` 而非 `{code, message, data:{...}}`。

**Acceptance Criteria:**
- [ ] 修改 `src/utils/request.ts` 中的 `request` 函数
- [ ] 自动解包 `data` 层：如果响应有 `code` 和 `data` 字段，返回 `json.data`
- [ ] 更新所有调用 `request` 的代码，移除多余的 `.data` 访问
- [ ] 确保错误响应仍然能正确抛出
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-019: 修复权限 API 未使用统一 request 方法（FRONT-04）
**Description:** 作为开发人员，我需要权限 store 使用统一的 request 方法，确保错误处理和 token 刷新逻辑一致。

**Acceptance Criteria:**
- [ ] 修改 `src/stores/permissionStore.ts`
- [ ] `fetchMenus` 和 `fetchPermissions` 改用 `import { get } from '@/utils/request'`
- [ ] 移除直接使用 `fetch()` 的代码
- [ ] 确保错误处理逻辑统一
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-020: 修复 BaseTable 分页逻辑复杂（FRONT-06）
**Description:** 作为开发人员，我需要简化 BaseTable 组件，移除客户端分页逻辑，统一使用服务端分页。

**Acceptance Criteria:**
- [ ] 修改 `src/components/BaseTable/index.tsx`
- [ ] 移除客户端分页相关逻辑和 props
- [ ] 确保只支持服务端分页模式
- [ ] 更新所有使用 BaseTable 的页面
- [ ] 确保分页功能正常
- [ ] TypeScript 类型检查通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-021: 删除备份文件残留（FRONT-07）
**Description:** 作为开发人员，我需要删除项目中残留的备份文件，使用 Git 管理版本。

**Acceptance Criteria:**
- [ ] 删除 `src/pages/Orders/OrderCreate.tsx.backup` 文件
- [ ] 检查并删除其他可能的 `.backup` 文件
- [ ] 确保 Git 提交记录清晰
- [ ] 项目构建成功

### US-022: 修复 CORS 配置宽松问题（SEC-03）
**Description:** 作为系统管理员，我需要收紧 CORS 配置，生产环境只允许实际域名，增强安全性。

**Acceptance Criteria:**
- [ ] 修改 `config/settings/prod.py` 中的 `CORS_ALLOWED_ORIGINS`
- [ ] 只配置实际生产域名
- [ ] 确保开发环境 `dev.py` 仍允许 localhost 端口
- [ ] 验证前后端跨域请求正常
- [ ] 后端测试通过

### US-023: 修复无前端测试问题（FRONT-08）
**Description:** 作为开发人员，我需要为关键模块添加前端测试，确保代码质量和回归保护。

**Acceptance Criteria:**
- [ ] 引入 Vitest + React Testing Library
- [ ] 配置测试环境
- [ ] 为 `src/utils/request.ts` 编写测试
- [ ] 为 `src/stores/auth.store.ts` 编写测试
- [ ] 为 `src/stores/permissionStore.ts` 编写测试
- [ ] 测试通过率 > 80%
- [ ] 确保 CI 能运行前端测试

### US-024: 修复编码不一致问题（BACK-06）
**Description:** 作为开发人员，我需要统一文件编码，确保中文注释不乱码，代码可读性一致。

**Acceptance Criteria:**
- [ ] 确保所有 `.py` 文件使用 UTF-8 编码
- [ ] 为有中文注释的文件添加 `# -*- coding: utf-8 -*-` 头
- [ ] 或统一使用无 BOM 的 UTF-8
- [ ] 运行 `make lint` 检查编码问题
- [ ] 确保 `exec` 扫描输出中文正常

### US-025: 修复两套 Role 模型问题（BACK-03）
**Description:** 作为开发人员，我需要解决两套 Role 模型的问题，统一权限模型，避免混淆。

**Acceptance Criteria:**
- [ ] 方案A：废弃 `users.Role`，统一使用 `permissions.Role`
- [ ] 或方案B：重命名 `users.Role` → `UserRole`（已废弃标记）
- [ ] 更新所有引用 `users.Role` 的代码
- [ ] 确保 `UserProfile.role` FK 指向正确的模型
- [ ] 生成并运行数据库迁移
- [ ] 后端测试通过

### US-026: 修复订单地址字段无结构化（BACK-05）
**Description:** 作为用户，我需要订单地址支持结构化存储，便于按城市/区域筛选。

**Acceptance Criteria:**
- [ ] 添加 `province`、`city`、`district` 字段到 `Order` 模型
- [ ] 或使用 JSONField 结构化存储地址
- [ ] 更新 `OrderFilterSet` 支持按城市筛选
- [ ] 迁移现有地址数据
- [ ] 生成并运行数据库迁移
- [ ] 后端测试通过

### US-027: 修复权限 API 路由前缀不一致（API-05）
**Description:** 作为开发人员，我需要统一权限 API 的路由前缀，使其与其他业务接口一致。

**Acceptance Criteria:**
- [ ] 修改 `config/urls.py`，将权限接口移到 `/api/v1/permissions/`
- [ ] 更新前端 `permissionStore.ts` 中的 `API_BASE`
- [ ] 确保所有权限相关请求使用新路径
- [ ] 后端测试通过
- [ ] 验证在浏览器中使用 dev-browser 技能

### US-028: 修复无数据库迁移版本管理检查（DB-02）
**Description:** 作为开发人员，我需要加强数据库迁移版本管理，确保迁移文件按顺序提交且完整。

**Acceptance Criteria:**
- [ ] 在 CI 中添加迁移检查步骤
- [ ] 检查迁移文件是否完整（`python manage.py makemigrations --check --dry-run`）
- [ ] 确保迁移文件按顺序提交
- [ ] 解决现有的迁移冲突记录
- [ ] CI 检查通过

### US-029: 修复缺少索引优化问题（DB-03）
**Description:** 作为开发人员，我需要为订单地址字段添加索引优化，提升查询性能。

**Acceptance Criteria:**
- [ ] 为 `Order.city` 字段添加 `db_index=True`
- [ ] 或为 `customer_address` 添加普通索引
- [ ] 分析其他常用查询字段，添加必要索引
- [ ] 生成并运行数据库迁移
- [ ] 查询性能测试验证

### US-030: 修复 Swagger 文档联系信息为占位符（DOC-01）
**Description:** 作为用户，我需要 Swagger 文档显示实际联系信息，提升文档专业性。

**Acceptance Criteria:**
- [ ] 修改 `config/urls.py` 中的 Swagger 配置
- [ ] 替换 `contact@example.com` 为实际联系邮箱
- [ ] 替换 `https://www.example.com/terms/` 为实际条款链接
- [ ] 验证 Swagger UI 显示正确信息
- [ ] 后端测试通过

### US-031: 修复部分文件缺少 docstring（DOC-02）
**Description:** 作为开发人员，我需要为公共 API 端点添加文档字符串，提升代码可读性和 Swagger 文档质量。

**Acceptance Criteria:**
- [ ] 为所有公共 API 视图添加 docstring
- [ ] 为关键前端组件添加 JSDoc 注释
- [ ] 确保 Swagger 能正确读取文档
- [ ] 运行 `make lint` 检查文档质量
- [ ] 代码评审通过

## Functional Requirements

- FR-1: 修复所有安全配置问题，确保生产环境安全
- FR-2: 统一前后端枚举值定义，消除状态不一致
- FR-3: 修复侧边栏菜单与路由匹配问题
- FR-4: 统一所有 API 响应格式，符合全局规范
- FR-5: 修复认证安全漏洞，包括密码验证和权限检查
- FR-6: 解决代码结构问题，包括包冲突、重复代码、模型混淆
- FR-7: 修复前端代码质量问题，包括未使用依赖、响应解包、分页逻辑
- FR-8: 加强数据库管理，包括迁移检查、索引优化
- FR-9: 完善文档和测试，包括 API 文档、代码注释、前端测试

## Non-Goals

- 不添加新功能，只修复现有问题
- 不进行大规模重构，除非必要
- 不改变现有业务逻辑，除非修复安全漏洞
- 不调整现有数据库架构，除非修复数据一致性问题
- 不引入新的第三方库，除非测试框架需要

## Design Considerations

- 遵循现有工程规范文档（工程规范文档.md）的设计原则
- 保持前后端分离架构不变
- 复用现有组件和样式，保持 UI 一致性
- 确保所有修复向后兼容，不破坏现有功能

## Technical Considerations

- 修复顺序遵循最小影响路径，先解决阻碍其他修复的问题
- 每个修复任务独立可验证，便于并行开发和测试
- 数据库迁移需谨慎，确保数据完整性和回滚能力
- 前端修复需考虑浏览器兼容性和性能影响
- 安全修复优先，防止安全漏洞被利用

## Success Metrics

- 所有 P1 问题修复完成，安全漏洞消除
- 所有 P2 问题修复完成，代码质量显著提升
- 所有 P3 问题修复完成，开发体验优化
- 代码质量检查通过率 > 95%（flake8、ESLint、TypeScript）
- 测试覆盖率提升 > 10%
- 构建和部署流程无阻塞
- 用户反馈无功能回归问题

## Open Questions

- 是否需要在修复过程中暂停新功能开发？
- 修复后的代码是否需要额外的代码评审？
- 是否需要对修复进行性能测试？
- 修复后的部署计划如何安排？（分批还是一次性）
