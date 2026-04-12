# 门窗安装管理系统 - 后端开发

## 📋 环境要求

### Python版本
- **生产环境**: Python 3.12 (Dockerfile指定)
- **开发环境**: Python 3.12.x (推荐) 或 Python 3.11+ (兼容)
- **验证**: `python --version` 应显示 `Python 3.12.x`

### 数据库
- **生产**: MySQL/MariaDB
- **开发**: SQLite (默认) 或 MySQL

### 其他依赖
- Redis (缓存和Celery任务队列)
- 充足的磁盘空间 (存储上传文件)

## 🚀 快速开始

### 方案A: 自动设置 (推荐)
```powershell
# 运行自动设置脚本
.\setup-dev.ps1
```
脚本将自动完成：
1. ✅ 检查Python 3.12
2. ✅ 创建虚拟环境 (venv)
3. ✅ 安装所有依赖
4. ✅ 验证项目兼容性

### 方案B: 手动设置
```powershell
# 1. 创建虚拟环境
py -3.12 -m venv venv

# 2. 激活虚拟环境 (PowerShell)
.\venv\Scripts\Activate.ps1

# 3. 安装依赖
pip install -r requirements/base.txt -r requirements/development.txt

# 4. 数据库迁移
python manage.py migrate

# 5. 创建超级用户 (可选)
python manage.py createsuperuser

# 6. 启动开发服务器
python manage.py runserver
```

## 🔧 开发工作流

### 代码质量
```bash
# 代码格式化
make format    # black + isort

# 代码检查
make lint      # flake8检查
make check     # 完整检查 (flake8 + black + isort)

# 修复所有格式问题
make fix-all
```

### 测试
```bash
# 运行所有测试
make test

# 运行特定测试
python -m pytest tests/test_health.py -v
python -m pytest tests/users/test_auth.py -v

# 测试并生成覆盖率报告
make test-cov

# 查看覆盖率报告
open htmlcov/index.html  # macOS/Linux
start htmlcov/index.html # Windows
```

### 数据库管理
```bash
# 创建迁移文件
python manage.py makemigrations <app_name>

# 应用迁移
python manage.py migrate

# 查看迁移状态
python manage.py showmigrations

# 回滚迁移
python manage.py migrate <app_name> <previous_migration>
```

## 📁 项目结构

```
backend/
├── config/                 # Django设置
│   ├── settings/
│   │   ├── base.py        # 基础设置
│   │   ├── dev.py         # 开发环境设置
│   │   └── production.py  # 生产环境设置
│   └── urls.py            # 主URL配置
├── apps/                   # 业务应用
│   ├── users/             # 用户管理
│   ├── orders/            # 订单管理
│   ├── products/          # 产品管理
│   └── ...               # 其他应用
├── common/                 # 公共模块
│   ├── health.py          # 健康检查端点
│   └── utils.py           # 工具函数
├── tests/                  # 测试文件
│   ├── test_health.py     # 健康检查测试
│   └── users/             # 用户相关测试
├── requirements/           # 依赖管理
│   ├── base.txt           # 生产依赖
│   └── development.txt    # 开发依赖
└── manage.py              # Django管理命令
```

## 🛠️ 常用命令

### Makefile命令
```bash
make help      # 查看所有可用命令
make lint      # 代码检查
make format    # 代码格式化
make check     # 完整代码检查
make test      # 运行测试
make test-cov  # 测试并生成覆盖率报告
make clean     # 清理临时文件
```

### Django管理命令
```bash
# 开发服务器
python manage.py runserver
python manage.py runserver 0.0.0.0:8000  # 允许外部访问

# 数据库
python manage.py dbshell           # 进入数据库shell
python manage.py dumpdata          # 导出数据
python manage.py loaddata          # 导入数据

# 用户管理
python manage.py createsuperuser   # 创建管理员
python manage.py changepassword    # 修改密码

# 静态文件
python manage.py collectstatic     # 收集静态文件
python manage.py compress          # 压缩静态文件
```

## ⚠️ 故障排除

### Python版本问题
```powershell
# 检查当前Python版本
python --version

# 如果显示Python 3.13/3.14，需要切换到3.12
py -3.12 --version

# 使用py启动器指定版本
py -3.12 manage.py runserver
```

### 虚拟环境问题
```powershell
# PowerShell执行策略限制
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 手动激活虚拟环境
& ".\venv\Scripts\Activate.ps1"

# 直接使用虚拟环境的Python
.\venv\Scripts\python.exe manage.py runserver
```

### 依赖安装失败
```powershell
# 更新pip
python -m pip install --upgrade pip

# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 逐个安装问题包
pip install mysqlclient==2.2.4
```

### 数据库连接失败
```python
# 检查settings.py中的数据库配置
# 开发环境默认使用SQLite
# 生产环境使用MySQL，需要配置连接信息
```

## 🔗 相关文档

1. **工程化实践**: 查看 `../ENGINEERING.md` 了解完整工程化改进
2. **API文档**: 启动服务后访问 `http://localhost:8000/api/docs/`
3. **健康检查**: 访问 `http://localhost:8000/api/health/`
4. **管理后台**: 访问 `http://localhost:8000/admin/`

## 📞 支持

遇到问题时：
1. 查看 `../ENGINEERING.md` 中的常见问题部分
2. 运行 `make test` 验证基本功能
3. 检查Python版本是否符合要求
4. 确保虚拟环境已正确激活

---

**最后更新**: 2026-04-13  
**兼容Python版本**: 3.11, 3.12  
**推荐Python版本**: 3.12.x (与生产环境一致)