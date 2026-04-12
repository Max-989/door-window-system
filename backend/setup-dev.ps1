# ============================================================
# 门窗安装管理系统 - 开发环境设置脚本
# 方案B: Python 3.12版本管理 (按顺序执行)
# ============================================================

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "门窗安装管理系统 - Python 3.12开发环境设置" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# 第1步: 检查Python 3.12是否已安装
Write-Host "[步骤1/6] 检查Python 3.12安装..." -ForegroundColor Yellow

$python312_available = $false
$python312_path = ""

# 检查py启动器中的Python 3.12
Write-Host "检查py启动器..." -ForegroundColor Gray
try {
    $py_list = py --list 2>&1
    if ($py_list -match "3\.12") {
        Write-Host "✅ 发现Python 3.12 (通过py启动器)" -ForegroundColor Green
        $python312_available = $true
        $python312_path = "py -3.12"
    }
} catch {
    Write-Host "⚠️  py启动器检查失败" -ForegroundColor Yellow
}

# 检查系统PATH中的Python 3.12
if (-not $python312_available) {
    Write-Host "检查系统PATH..." -ForegroundColor Gray
    $pythonPaths = @("python3.12", "python", "py")
    foreach ($cmd in $pythonPaths) {
        try {
            $version = & $cmd --version 2>&1
            if ($version -match "Python 3\.12") {
                Write-Host "✅ 发现Python 3.12 (通过$cmd)" -ForegroundColor Green
                $python312_available = $true
                $python312_path = $cmd
                break
            }
        } catch {
            # 命令不存在，继续检查下一个
        }
    }
}

if (-not $python312_available) {
    Write-Host "❌ 未找到Python 3.12" -ForegroundColor Red
    Write-Host ""
    Write-Host "请安装Python 3.12:" -ForegroundColor Yellow
    Write-Host "1. 下载: https://www.python.org/downloads/release/python-3120/" -ForegroundColor White
    Write-Host "2. 安装时勾选 'Add Python to PATH'" -ForegroundColor White
    Write-Host "3. 建议安装路径: C:\Python312" -ForegroundColor White
    Write-Host ""
    Write-Host "安装完成后重新运行此脚本。" -ForegroundColor Yellow
    Write-Host "===========================================================" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Python 3.12已安装" -ForegroundColor Green
Write-Host ""

# 第2步: 验证Python版本
Write-Host "[步骤2/6] 验证Python版本..." -ForegroundColor Yellow
try {
    $version = Invoke-Expression "$python312_path --version"
    Write-Host "✅ 当前Python版本: $version" -ForegroundColor Green
} catch {
    Write-Host "❌ 无法获取Python版本" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 第3步: 创建虚拟环境
Write-Host "[步骤3/6] 创建虚拟环境..." -ForegroundColor Yellow
$venvPath = ".\venv"

if (Test-Path $venvPath) {
    Write-Host "⚠️  虚拟环境已存在，跳过创建" -ForegroundColor Yellow
} else {
    try {
        Write-Host "创建虚拟环境..." -ForegroundColor Gray
        & $python312_path -m venv venv
        if (Test-Path $venvPath) {
            Write-Host "✅ 虚拟环境创建成功" -ForegroundColor Green
        } else {
            Write-Host "❌ 虚拟环境创建失败" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ 创建虚拟环境时出错: $_" -ForegroundColor Red
        Write-Host "尝试手动创建: $python312_path -m venv venv" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# 第4步: 激活虚拟环境
Write-Host "[步骤4/6] 激活虚拟环境..." -ForegroundColor Yellow
$activateScript = ".\venv\Scripts\Activate.ps1"

if (-not (Test-Path $activateScript)) {
    Write-Host "❌ 激活脚本不存在: $activateScript" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "激活虚拟环境..." -ForegroundColor Gray
    & $activateScript
    
    # 验证激活
    $venvPython = ".\venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        $venvVersion = & $venvPython --version
        Write-Host "✅ 虚拟环境已激活: $venvVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ 虚拟环境激活失败" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️  激活脚本执行失败，可能是PowerShell执行策略限制" -ForegroundColor Yellow
    Write-Host "尝试手动激活: .\venv\Scripts\Activate.ps1" -ForegroundColor White
    Write-Host "或设置执行策略: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White
}
Write-Host ""

# 第5步: 安装项目依赖
Write-Host "[步骤5/6] 安装项目依赖..." -ForegroundColor Yellow

# 检查依赖文件
$baseReq = ".\requirements\base.txt"
$devReq = ".\requirements\development.txt"

if (-not (Test-Path $baseReq)) {
    Write-Host "❌ 依赖文件不存在: $baseReq" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $devReq)) {
    Write-Host "⚠️  开发依赖文件不存在: $devReq" -ForegroundColor Yellow
    Write-Host "将只安装基础依赖" -ForegroundColor Gray
    $devReq = $null
}

try {
    # 更新pip
    Write-Host "更新pip..." -ForegroundColor Gray
    & $venvPython -m pip install --upgrade pip
    
    # 安装基础依赖
    Write-Host "安装基础依赖..." -ForegroundColor Gray
    & $venvPython -m pip install -r $baseReq
    
    # 安装开发依赖
    if ($devReq) {
        Write-Host "安装开发依赖..." -ForegroundColor Gray
        & $venvPython -m pip install -r $devReq
    }
    
    Write-Host "✅ 依赖安装完成" -ForegroundColor Green
    
    # 显示关键依赖版本
    Write-Host ""
    Write-Host "关键依赖版本:" -ForegroundColor Cyan
    $packages = @("Django", "djangorestframework", "mysqlclient", "pytest", "black", "flake8")
    foreach ($pkg in $packages) {
        try {
            $version = & $venvPython -c "import $pkg; print(f'$pkg: {' + $pkg + '.__version__}')" 2>&1
            if ($version -match "error") {
                Write-Host "  $pkg: 未安装" -ForegroundColor Gray
            } else {
                Write-Host "  $($version.Trim())" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  $pkg: 检查失败" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ 依赖安装失败: $_" -ForegroundColor Red
    Write-Host "尝试手动安装: pip install -r requirements/base.txt" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 第6步: 验证项目兼容性
Write-Host "[步骤6/6] 验证项目兼容性..." -ForegroundColor Yellow

try {
    # 1. Django健康检查
    Write-Host "运行Django健康检查..." -ForegroundColor Gray
    & $venvPython manage.py check
    
    # 2. 运行测试
    Write-Host "运行测试套件..." -ForegroundColor Gray
    & $venvPython -m pytest tests/test_health.py -v
    
    Write-Host "✅ 项目兼容性验证通过" -ForegroundColor Green
} catch {
    Write-Host "⚠️  兼容性验证遇到问题: $_" -ForegroundColor Yellow
    Write-Host "这可能不影响基本功能，但建议进一步检查。" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "✅ 开发环境设置完成！" -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "后续操作:" -ForegroundColor Yellow
Write-Host "1. 激活虚拟环境: .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "2. 运行完整测试: python -m pytest tests/ -v" -ForegroundColor White
Write-Host "3. 启动开发服务器: python manage.py runserver" -ForegroundColor White
Write-Host "4. 代码质量检查: make lint 或 python -m flake8 ." -ForegroundColor White
Write-Host ""
Write-Host "如需重新运行此脚本，请先删除 venv 文件夹。" -ForegroundColor Gray
Write-Host "===========================================================" -ForegroundColor Cyan