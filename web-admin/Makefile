.PHONY: help install-dev dev build test lint format clean

help:
	@echo "可用命令:"
	@echo "  make install-dev   安装开发依赖"
	@echo "  make dev           启动开发服务器"
	@echo "  make build         构建生产版本"
	@echo "  make test          运行测试 (待实现)"
	@echo "  make lint          代码检查 (ESLint)"
	@echo "  make format        代码格式化 (Prettier)"
	@echo "  make check         完整检查 (lint + format + type)"
	@echo "  make clean         清理构建文件"

install-dev:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	@echo "测试待实现 - 需要配置Vitest"

lint:
	npm run lint

format:
	npm run format

check:
	npm run validate

clean:
	rm -rf dist node_modules/.vite