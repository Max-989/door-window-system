#!/usr/bin/env python3
"""
环境检查脚本
验证门窗安装管理系统开发环境配置是否正确
"""

import os
import platform
import subprocess
import sys


def run_command(cmd, capture_output=True):
    """运行命令并返回结果"""
    try:
        if capture_output:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=10
            )
            return result.returncode, result.stdout.strip(), result.stderr.strip()
        else:
            result = subprocess.run(cmd, shell=True, timeout=10)
            return result.returncode, "", ""
    except subprocess.TimeoutExpired:
        return -1, "", "命令执行超时"
    except Exception as e:
        return -1, "", f"命令执行失败: {str(e)}"


def print_status(description, status, details=""):
    """打印状态信息"""
    if status:
        symbol = "✅"
        color_code = "\033[92m"  # 绿色
    else:
        symbol = "❌"
        color_code = "\033[91m"  # 红色

    reset_code = "\033[0m"
    print(f"{color_code}{symbol} {description}{reset_code}")
    if details:
        print(f"    {details}")


def check_python_version():
    """检查Python版本"""
    print("\n🔍 检查Python版本...")

    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"

    # 检查是否为Python 3.12
    is_312 = version.major == 3 and version.minor == 12
    is_compatible = version.major == 3 and version.minor >= 11

    print_status("Python版本", True, f"当前版本: {version_str}")

    if is_312:
        print_status("版本匹配", True, "Python 3.12.x (与生产环境一致)")
    elif is_compatible:
        print_status("版本兼容", True, f"Python {version_str} (兼容，但推荐使用3.12)")
    else:
        print_status("版本兼容", False, f"Python {version_str} (不兼容，需要3.11+)")

    return is_compatible


def check_virtual_environment():
    """检查是否在虚拟环境中"""
    print("\n🔍 检查虚拟环境...")

    in_venv = sys.prefix != sys.base_prefix
    venv_path = sys.prefix

    if in_venv:
        print_status("虚拟环境", True, f"虚拟环境已激活: {venv_path}")
    else:
        print_status("虚拟环境", False, "未检测到虚拟环境，建议使用venv")

    return in_venv


def check_django():
    """检查Django安装"""
    print("\n🔍 检查Django...")

    try:
        import django

        version = django.get_version()
        print_status("Django安装", True, f"版本: {version}")

        # 检查Django配置
        try:
            os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
            django.setup()
            from django.conf import settings

            # 检查关键配置
            checks = [
                ("DEBUG模式", settings.DEBUG, "开发环境应为True"),
                ("数据库引擎", settings.DATABASES["default"]["ENGINE"], ""),
                ("密钥配置", len(settings.SECRET_KEY) > 20, "密钥长度足够"),
            ]

            for name, condition, detail in checks:
                if condition:
                    if detail:
                        print_status(f"  {name}", True, detail)
                    else:
                        print_status(f"  {name}", True)
                else:
                    print_status(f"  {name}", False, detail)

            return True
        except Exception as e:
            print_status("Django配置", False, f"配置错误: {str(e)}")
            return False

    except ImportError:
        print_status("Django安装", False, "Django未安装")
        return False


def check_dependencies():
    """检查关键依赖"""
    print("\n🔍 检查关键依赖...")

    dependencies = [
        ("djangorestframework", "DRF框架"),
        ("djangorestframework_simplejwt", "JWT认证"),
        ("pytest", "测试框架"),
        ("black", "代码格式化"),
        ("flake8", "代码检查"),
        ("psutil", "系统监控"),
    ]

    all_ok = True
    for package, description in dependencies:
        try:
            __import__(package.replace("-", "_"))
            print_status(f"  {description}", True, package)
        except ImportError:
            print_status(f"  {description}", False, f"{package} 未安装")
            all_ok = False

    return all_ok


def check_project_structure():
    """检查项目结构"""
    print("\n🔍 检查项目结构...")

    required_dirs = [
        "apps",
        "common",
        "config",
        "tests",
    ]

    required_files = [
        "manage.py",
        "requirements/base.txt",
        "requirements/development.txt",
        "pyproject.toml",
        ".flake8",
    ]

    all_ok = True

    for dir_name in required_dirs:
        if os.path.isdir(dir_name):
            print_status(f"  目录: {dir_name}", True)
        else:
            print_status(f"  目录: {dir_name}", False, "目录不存在")
            all_ok = False

    for file_name in required_files:
        if os.path.isfile(file_name):
            print_status(f"  文件: {file_name}", True)
        else:
            print_status(f"  文件: {file_name}", False, "文件不存在")
            all_ok = False

    return all_ok


def check_health_endpoint():
    """检查健康检查端点"""
    print("\n🔍 检查健康检查端点...")

    try:
        # 导入健康检查模块
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        # 模拟请求
        from django.test import RequestFactory

        from common.health import health_check, ping

        factory = RequestFactory()

        # 测试ping端点
        request = factory.get("/api/ping/")
        response = ping(request)
        ping_ok = response.status_code == 200

        print_status("  Ping端点", ping_ok, f"状态码: {response.status_code}")

        # 测试health端点（可能需要数据库连接）
        try:
            request = factory.get("/api/health/")
            response = health_check(request)
            health_ok = response.status_code in [200, 206, 503]

            print_status("  Health端点", health_ok, f"状态码: {response.status_code}")
            if response.status_code == 206:
                print("    ⚠️  健康检查返回降级状态 (206)")
            elif response.status_code == 503:
                print("    ⚠️  健康检查返回故障状态 (503)")
        except Exception as e:
            print_status("  Health端点", False, f"执行错误: {str(e)}")
            health_ok = False

        return ping_ok and health_ok

    except Exception as e:
        print_status("健康检查端点", False, f"检查失败: {str(e)}")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("门窗安装管理系统 - 环境配置检查")
    print("=" * 60)
    print(f"系统: {platform.system()} {platform.release()}")
    print(f"Python: {sys.executable}")
    print("=" * 60)

    results = []

    # 执行各项检查
    results.append(("Python版本", check_python_version()))
    results.append(("虚拟环境", check_virtual_environment()))
    results.append(("Django配置", check_django()))
    results.append(("依赖检查", check_dependencies()))
    results.append(("项目结构", check_project_structure()))

    # 健康检查端点（可选）
    try:
        results.append(("健康检查", check_health_endpoint()))
    except Exception:
        print_status("健康检查", False, "跳过检查（需要完整Django环境）")
        results.append(("健康检查", False))

    # 汇总结果
    print("\n" + "=" * 60)
    print("检查结果汇总:")
    print("=" * 60)

    total = len(results)
    passed = sum(1 for _, status in results if status)

    for name, status in results:
        symbol = "✅" if status else "❌"
        color = "\033[92m" if status else "\033[91m"
        reset = "\033[0m"
        print(f"{color}{symbol} {name}{reset}")

    print("=" * 60)
    success_rate = (passed / total) * 100 if total > 0 else 0
    print(f"通过率: {passed}/{total} ({success_rate:.1f}%)")

    if success_rate >= 80:
        print("✅ 环境配置基本正常，可以开始开发")
    elif success_rate >= 50:
        print("⚠️  环境存在一些问题，建议修复")
    else:
        print("❌ 环境配置存在严重问题，需要修复")

    print("=" * 60)

    # 提供建议
    if success_rate < 100:
        print("\n建议操作:")
        print("1. 运行 setup-dev.ps1 自动配置环境")
        print("2. 查看 ENGINEERING.md 中的环境配置说明")
        print("3. 确保使用 Python 3.12 和虚拟环境")

    return success_rate >= 80


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n检查被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 检查过程中发生错误: {str(e)}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
