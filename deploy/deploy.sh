#!/bin/bash
# ============================================================
# 门窗安装管理系统 - 一键部署脚本
# 用法: bash deploy.sh [命令]
# 命令:
#   start    - 首次部署（构建+启动+迁移+创建超级用户）
#   restart  - 重启所有服务
#   stop     - 停止所有服务
#   migrate  - 执行数据库迁移
#   createsu - 创建超级用户
#   logs     - 查看日志
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查 .env 文件
check_env() {
    if [ ! -f .env ]; then
        warn "未找到 .env 文件，从 .env.example 复制..."
        cp .env.example .env
        warn "请编辑 .env 文件，修改默认密码和密钥后重新运行"
        exit 1
    fi
}

# 等待服务健康
wait_for_healthy() {
    local service=$1
    local max_wait=${2:-60}
    local elapsed=0
    info "等待 $service 服务就绪..."
    while [ $elapsed -lt $max_wait ]; do
        status=$(docker inspect --format='{{.State.Health.Status}}' "door-$service" 2>/dev/null || echo "missing")
        if [ "$status" = "healthy" ]; then
            info "$service 已就绪"
            return 0
        fi
        sleep 3
        elapsed=$((elapsed + 3))
    done
    error "$service 在 ${max_wait}s 内未就绪"
}

# 首次部署
do_start() {
    check_env

    info "====== 门窗安装管理系统 - 开始部署 ======"

    # 创建必要目录
    mkdir -p backend/logs backend/media frontend/ssl mysql/conf.d

    # 构建镜像
    info "构建 Docker 镜像..."
    docker compose build

    # 启动基础服务
    info "启动 MySQL 和 Redis..."
    docker compose up -d mysql redis

    wait_for_healthy mysql 120
    wait_for_healthy redis 30

    # 启动后端
    info "启动 Django 后端..."
    docker compose up -d django-backend

    sleep 10

    # 执行数据库迁移
    info "执行数据库迁移..."
    docker compose exec django-backend python manage.py migrate --no-input || {
        warn "迁移执行失败，可能需要检查数据库连接"
    }

    # 收集静态文件
    info "收集静态文件..."
    docker compose exec django-backend python manage.py collectstatic --no-input || {
        warn "静态文件收集失败（非致命错误）"
    }

    # 启动 Celery
    info "启动 Celery 异步任务..."
    docker compose up -d celery-worker celery-beat

    # 启动前端
    info "启动 React 前端..."
    docker compose up -d react-frontend

    info ""
    info "====== 部署完成 ======"
    info "前端访问: http://localhost"
    info "后端 API: http://localhost:8000"
    info "Django Admin: http://localhost:8000/admin/"
    warn "请运行 'bash deploy.sh createsu' 创建超级管理员"
}

# 执行迁移
do_migrate() {
    info "执行数据库迁移..."
    docker compose exec django-backend python manage.py migrate --no-input
}

# 创建超级用户
do_create_superuser() {
    info "创建超级管理员..."
    docker compose exec -it django-backend python manage.py createsuperuser
}

# 重启
do_restart() {
    info "重启所有服务..."
    docker compose restart
}

# 停止
do_stop() {
    info "停止所有服务..."
    docker compose down
}

# 查看日志
do_logs() {
    docker compose logs -f --tail=100 "${@:-}"
}

# -------------------- 主入口 --------------------
case "${1:-start}" in
    start)   do_start ;;
    restart) do_restart ;;
    stop)    do_stop ;;
    migrate) do_migrate ;;
    createsu) do_create_superuser ;;
    logs)    shift; do_logs "$@" ;;
    *)       echo "用法: $0 {start|restart|stop|migrate|createsu|logs}" ;;
esac
