.PHONY: help install-dev test lint format clean env-check setup-venv fix-all run-dev

help:
	@echo "门窗安装管理系统 - 开发命令"
	@echo "============================="
	@echo "环境设置:"
	@echo "  make setup-venv    创建Python 3.12虚拟环境"
	@echo "  make install-dev   安装开发依赖"
	@echo "  make env-check     检查开发环境配置"
	@echo ""
	@echo "代码质量:"
	@echo "  make lint          代码检查 (flake8)"
	@echo "  make format        代码格式化 (black + isort)"
	@echo "  make fix-all       自动修复所有格式问题"
	@echo "  make check         完整检查 (lint + format检查)"
	@echo ""
	@echo "测试:"
	@echo "  make test          运行测试"
	@echo "  make test-cov      运行测试并生成覆盖率报告"
	@echo ""
	@echo "开发:"
	@echo "  make run-dev       启动开发服务器"
	@echo ""
	@echo "维护:"
	@echo "  make clean         清理缓存文件"
	@echo ""
	@echo "提示: 首次使用请先运行 'make setup-venv'"

install-dev:
	pip install -r requirements/development.txt

test:
	pytest -v

test-cov:
	pytest --cov=. --cov-report=html --cov-report=term-missing

lint:
	flake8 .

format:
	black .
	isort .

check:
	black --check .
	isort --check .
	flake8 .

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true

env-check:
	@echo "检查开发环境配置..."
	@python check-env.py || echo "环境检查失败，请查看输出"

setup-venv:
	@echo "设置Python 3.12虚拟环境..."
	@echo "注意: 此命令假设已安装Python 3.12"
	@echo "如果未安装，请先安装Python 3.12:"
	@echo "  https://www.python.org/downloads/release/python-3120/"
	@echo ""
	@if command -v py >/dev/null 2>&1; then \
		echo "使用py启动器创建虚拟环境..."; \
		py -3.12 -m venv venv; \
	elif command -v python3.12 >/dev/null 2>&1; then \
		echo "使用python3.12创建虚拟环境..."; \
		python3.12 -m venv venv; \
	elif command -v python >/dev/null 2>&1; then \
		echo "使用python创建虚拟环境..."; \
		python -m venv venv; \
	else \
		echo "错误: 未找到Python命令"; \
		exit 1; \
	fi
	@echo ""
	@echo "✅ 虚拟环境创建完成"
	@echo "激活虚拟环境:"
	@echo "  PowerShell: .\venv\Scripts\Activate.ps1"
	@echo "  CMD: venv\Scripts\activate.bat"
	@echo "  Bash: source venv/bin/activate"

fix-all:
	@echo "自动修复所有格式问题..."
	black .
	isort .
	@echo "✅ 格式修复完成"

run-dev:
	@echo "启动开发服务器..."
	python manage.py runserver