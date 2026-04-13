# ============================================================
# 门窗安装管理系统 - Django 后端 Dockerfile
# 基于 Python 3.12 + Gunicorn 生产部署
# ============================================================

FROM python:3.12-slim AS base

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TZ=Asia/Shanghai

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 Python 依赖（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt gunicorn

# 复制项目代码
COPY . .

# 创建日志和媒体文件目录
RUN mkdir -p /app/logs /app/media

# 收集静态文件（部署时由 entrypoint 执行）

# 创建非 root 用户运行
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# Gunicorn 启动
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "gthread", \
     "--threads", "2", \
     "--timeout", "120", \
     "--access-logfile", "/app/logs/access.log", \
     "--error-logfile", "/app/logs/error.log", \
     "--log-level", "info", \
     "config.wsgi:application"]
