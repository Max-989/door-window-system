# 工程化实践改进文档

## 概述

本文档记录了门窗安装管理系统项目工程化实践的改进措施，旨在将项目从"手工作坊"模式升级为"工业化生产"模式。

## 已完成改进

### 1. Docker部署修复
- **问题**：Docker构建路径引用错误 (`../02-后端开发/02-源代码`)
- **修复**：修正为正确的相对路径 (`../backend`, `../web-admin`)
- **影响**：现在可以正常使用 `docker-compose up` 构建和启动服务

### 2. 健康检查端点
- **新增**：`/api/health/` 和 `/api/ping/` 端点
- **功能**：
  - 数据库连接状态检查
  - Redis缓存状态检查  
  - 磁盘空间监控
  - 内存使用监控（需安装psutil）
- **用途**：Docker健康检查、负载均衡健康检查、系统监控

### 3. 代码质量工具配置

#### 前端 (React + TypeScript)
- **ESLint配置**：`.eslintrc.json` - 包含TypeScript、React、React Hooks规则
- **Prettier配置**：`.prettierrc.json` - 代码格式化规范
- **TypeScript严格模式**：启用 `noImplicitAny`、`strictNullChecks` 等
- **脚本命令**：
  - `npm run lint` - 代码检查并自动修复
  - `npm run format` - 代码格式化
  - `npm run validate` - 完整验证（lint + format + type check）

#### 后端 (Django + Python)
- **Black配置**：`pyproject.toml` - 代码格式化（行宽88）
- **Flake8配置**：`.flake8` - 代码风格检查
- **isort配置**：`pyproject.toml` - import语句排序
- **pre-commit配置**：`.pre-commit-config.yaml` - Git提交前自动检查
- **Makefile**：简化常用命令（`make lint`, `make format`, `make test`）

### 4. 测试框架配置
- **pytest配置**：`pytest.ini` - 测试运行配置
- **测试示例**：`tests/test_health.py` - 健康检查端点测试
- **覆盖率报告**：配置pytest-cov生成HTML覆盖率报告

### 5. 开发依赖管理
- **分离依赖**：`requirements/development.txt` 包含测试和代码质量工具
- **基础依赖**：`requirements/base.txt` 生产环境必要依赖
- **环境区分**：开发环境安装 `-r requirements/development.txt`

### 6. Git配置
- **.gitignore**：全面配置，排除Python缓存、Node模块、IDE文件等
- **空目录占位**：`logs/.gitkeep`, `media/.gitkeep` 确保目录被跟踪

### 7. Python版本管理
- **生产环境**：Python 3.12 (Dockerfile指定)
- **开发环境要求**：Python 3.12.x (与生产环境一致)
- **兼容版本**：Python 3.11+ (测试验证通过)
- **工具支持**：py启动器、pyenv-win、conda环境管理

## 开发环境设置 (方案B: Python版本管理)

### Python 3.12安装
门窗安装管理系统要求使用 **Python 3.12.x** 以保证与生产环境一致。

#### Windows安装步骤：
1. **下载Python 3.12**
   - 官网: https://www.python.org/downloads/release/python-3120/
   - 选择: "Windows installer (64-bit)"

2. **安装选项**：
   - ✅ 勾选 "Add Python to PATH"
   - ✅ 选择 "Customize installation"
   - ✅ 建议安装路径: `C:\Python312`
   - ✅ 确保 "pip" 和 "py launcher" 被选中

3. **验证安装**：
   ```powershell
   # 方法1: 使用py启动器
   py -3.12 --version
   
   # 方法2: 直接调用
   python3.12 --version
   
   # 方法3: 查看所有已安装版本
   py --list
   ```

#### 快速设置脚本
项目提供了自动设置脚本 `backend/setup-dev.ps1`：
```powershell
# 进入项目目录
cd I:\AI test\claude code test\door-system\backend

# 运行设置脚本
.\setup-dev.ps1
```
脚本将自动：
1. 检查Python 3.12是否已安装
2. 创建虚拟环境 (venv)
3. 安装所有项目依赖
4. 验证项目兼容性

#### 手动设置步骤：
```powershell
# 1. 创建虚拟环境
py -3.12 -m venv venv

# 2. 激活虚拟环境 (PowerShell)
.\venv\Scripts\Activate.ps1

# 3. 安装依赖
pip install -r requirements/base.txt -r requirements/development.txt

# 4. 验证安装
python -m pytest tests/test_health.py -v
```

### 版本管理工具推荐
#### pyenv-win (专业版本切换)
```powershell
# 安装pyenv-win
Invoke-WebRestMethod -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile install-pyenv-win.ps1
.\install-pyenv-win.ps1

# 安装Python 3.12
pyenv install 3.12.0

# 在项目目录设置本地版本
cd I:\AI test\claude code test\door-system\backend
pyenv local 3.12.0
```

#### Miniconda (科学计算友好)
```powershell
# 创建独立环境
conda create -n door-system python=3.12
conda activate door-system
```

### IDE配置
#### VS Code
创建 `.vscode/settings.json`：
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/Scripts/python.exe",
  "python.terminal.activateEnvironment": true,
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true
}
```

#### PyCharm
1. **File → Settings → Project → Python Interpreter**
2. 点击齿轮 → Add Interpreter
3. 选择 "Existing environment" → 浏览到 `venv\Scripts\python.exe`

### 故障排除
#### PowerShell执行策略限制
```powershell
# 允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 只对当前会话生效
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

#### mysqlclient安装失败 (Windows)
```powershell
# 方案1: 安装MySQL Connector C
# 下载: https://dev.mysql.com/downloads/connector/c/

# 方案2: 使用pymysql (临时替代)
pip install pymysql
# 在settings.py中添加:
import pymysql
pymysql.install_as_MySQLdb()
```

#### 虚拟环境激活失败
```powershell
# 手动执行激活脚本
& ".\venv\Scripts\Activate.ps1"

# 或直接使用虚拟环境的python
.\venv\Scripts\python.exe --version
```

### 环境验证清单
完成设置后，验证以下项目：
```powershell
# 1. Python版本
python --version                    # 应显示 Python 3.12.x

# 2. 虚拟环境激活
where python                        # 应指向 venv\Scripts\python.exe

# 3. 关键依赖
python -c "import django; print(django.__version__)"  # 应显示 5.2.13

# 4. 测试通过
python -m pytest tests/test_health.py -v  # 4个测试应全部通过

# 5. 代码质量检查
python -m flake8 . --count          # 错误数应 <= 101 (当前已知)
```

## 使用指南

### 前端开发
```bash
cd web-admin

# 安装依赖
npm ci

# 开发模式
npm run dev

# 代码检查
npm run lint
npm run format
npm run validate

# 构建生产版本
npm run build
```

### 后端开发
```bash
cd backend

# 1. 激活虚拟环境 (如果使用方案B)
.\venv\Scripts\Activate.ps1

# 2. 安装开发依赖 (如果还没安装)
pip install -r requirements/development.txt

# 3. 代码质量检查
make lint      # flake8检查
make format    # black + isort格式化
make check     # 完整检查

# 4. 运行测试
make test      # 运行所有测试
make test-cov  # 测试并生成覆盖率报告

# 5. 数据库操作
python manage.py migrate     # 应用迁移
python manage.py createsuperuser  # 创建管理员
python manage.py runserver   # 启动开发服务器
```

### Docker部署
```bash
cd deploy

# 复制环境变量模板
cp .env.example .env
# 编辑 .env 修改密码和密钥

# 一键部署
bash deploy.sh start

# 创建超级用户
bash deploy.sh createsu
```

## CI/CD自动化流水线

门窗安装管理系统已配置GitHub Actions自动化CI/CD流水线，每次代码提交自动运行完整质量检查。

### 流水线配置
配置文件：`.github/workflows/ci.yml`

### 触发条件
- **代码推送**：推送到main/master/develop分支时触发
- **Pull Request**：创建或更新PR时触发
- **定时任务**：每天UTC时间2:00运行完整测试

### 工作流程
流水线包含5个并行作业：

1. **后端测试** (Backend Tests)
   - 在Python 3.11和3.12两个版本上运行测试
   - 使用SQLite内存数据库（快速测试）
   - 运行完整测试套件并生成覆盖率报告
   - 上传覆盖率到Codecov（可选）

2. **后端代码质量** (Backend Code Quality)
   - Black代码格式化检查
   - isort导入排序检查
   - Flake8代码风格检查
   - 生成lint报告

3. **前端检查** (Frontend Checks)
   - TypeScript类型检查
   - Prettier代码格式化检查
   - 前端构建验证
   - 注：前端ESLint问题暂未解决

4. **Docker构建验证** (Docker Build Verification)
   - 验证后端Dockerfile配置
   - 验证前端Dockerfile配置
   - 验证docker-compose.yml配置

5. **安全扫描** (Security Scan)
   - 使用safety检查Python依赖漏洞
   - 生成安全报告

### 本地运行CI检查
在提交代码前，可以在本地运行类似检查：

```bash
cd backend

# 运行测试
make test

# 代码质量检查
make check

# 环境检查
python check-env.py
```

### 测试覆盖率
- 当前目标：核心业务模块 >70%
- 关键路径：用户认证、健康检查 >90%
- 覆盖率报告：CI生成HTML报告

### 故障排除
如果CI失败：

1. **查看失败作业日志**
2. **本地复现问题**：在相同Python版本下运行`make test`
3. **检查环境差异**：运行`python check-env.py`
4. **修复后重新提交**

### 后续优化
- 添加部署自动化（生产/预发环境）
- 集成前端ESLint检查
- 添加性能测试
- 配置自动化API文档生成

## 下一步改进计划

### 高优先级
1. **完善测试覆盖** - 核心业务模块单元测试
2. **配置CI/CD** - GitHub Actions自动测试和部署
3. **API文档自动化** - 配置drf-yasg生成Swagger文档

### 中优先级
1. **前端测试配置** - 配置Vitest单元测试
2. **性能监控** - 添加应用性能监控(APM)
3. **错误追踪** - 集成Sentry错误追踪

### 低优先级
1. **容器优化** - 多阶段构建减小镜像体积
2. **安全扫描** - 集成安全漏洞扫描
3. **部署编排** - Kubernetes部署配置

## 工程化原则

### 1. 代码即文档
- 代码风格一致，减少认知负担
- 类型安全(TypeScript)减少运行时错误
- 自动生成API文档

### 2. 自动化一切
- 代码检查自动化
- 测试自动化
- 部署自动化

### 3. 快速反馈
- 本地开发即时检查
- CI/CD快速失败
- 监控告警及时响应

### 4. 可重复性
- 开发环境一致(Docker)
- 构建过程可重复
- 部署过程可重复

## 常见问题

### Q: 代码格式化与现有代码冲突怎么办？
A: 使用 `make format` (后端) 或 `npm run format` (前端) 自动格式化所有代码，然后提交。

### Q: 测试覆盖率要求多少？
A: 初始目标：核心业务逻辑 >70%，关键路径 >90%。逐步提高。

### Q: 本地开发需要安装所有工具吗？
A: 建议安装，但Docker开发环境也在计划中。

### Q: pre-commit检查失败怎么办？
A: 根据错误信息修复代码，或使用 `--no-verify` 临时跳过（不推荐）。

## 贡献指南

1. Fork项目仓库
2. 创建功能分支 (`feat/xxx` 或 `fix/xxx`)
3. 编写代码并通过所有检查 (`make check` / `npm run validate`)
4. 添加或更新测试
5. 提交Pull Request，确保CI通过

---

**最后更新：** 2026-04-13  
**维护者：** 码农 (AI助手)