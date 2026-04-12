# 门窗安装管理系统 - 部署文档

## 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 24.0+ | 容器运行环境 |
| Docker Compose | 2.20+ | 容器编排 |
| 磁盘空间 | 10GB+ | 镜像 + 数据 |
| 内存 | 4GB+ | 推荐 8GB |

## 目录结构

```
04-部署配置/
├── docker-compose.yml      # 服务编排
├── .env.example            # 环境变量模板
├── deploy.sh               # 一键部署脚本
├── backend/
│   ├── Dockerfile           # Django 后端镜像
│   └── Dockerfile.celery    # Celery 镜像
├── frontend/
│   ├── Dockerfile           # 前端构建镜像
│   └── nginx.conf           # Nginx 配置
├── mysql/conf.d/            # MySQL 自定义配置（可选）
└── frontend/ssl/            # SSL 证书（HTTPS 时使用）
```

## 快速部署

### 1. 复制并配置环境变量

```bash
cd 04-部署配置
cp .env.example .env
# 编辑 .env，修改密码和密钥！
```

生成安全密钥：

```bash
openssl rand -hex 32   # SECRET_KEY
openssl rand -hex 32   # JWT_SECRET_KEY
```

### 2. 一键部署

```bash
bash deploy.sh start
```

### 3. 创建超级管理员

```bash
bash deploy.sh createsu
```

### 4. 访问

- **前端**: http://localhost
- **后端 API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

## 日常运维

```bash
# 重启所有服务
bash deploy.sh restart

# 停止所有服务
bash deploy.sh stop

# 执行数据库迁移
bash deploy.sh migrate

# 查看日志
bash deploy.sh logs              # 所有服务
bash deploy.sh logs backend      # 仅后端
bash deploy.sh logs celery-worker # 仅 Celery
```

## 常见问题

### Q: MySQL 启动失败
检查磁盘空间是否充足，确保 3306 端口未被占用：
```bash
netstat -tlnp | grep 3306
```

### Q: 前端页面空白（404）
确认后端 API 可访问，检查 nginx 日志：
```bash
bash deploy.sh logs react-frontend
```

### Q: Celery 任务不执行
确认 Redis 连接正常，检查 worker 日志：
```bash
bash deploy.sh logs celery-worker
```

### Q: 数据迁移失败
确保 MySQL 完全启动后再执行迁移，可手动等待后重试：
```bash
bash deploy.sh migrate
```

### Q: 文件上传失败
检查 `backend/media` 目录权限和磁盘空间。如需使用 OSS，在 `.env` 中配置相关参数并设置 `OSS_ENABLED=true`。

## HTTPS 配置（生产环境）

1. 将 SSL 证书放入 `frontend/ssl/` 目录：
   ```
   frontend/ssl/
   ├── your-domain.crt
   └── your-domain.key
   ```

2. 修改 `frontend/nginx.conf`，添加 SSL 配置块（参考 Nginx 官方文档）。

## 生产环境建议

- [ ] 修改所有默认密码和密钥
- [ ] 配置 HTTPS
- [ ] 配置定期数据库备份
- [ ] 设置防火墙规则，仅暴露 80/443 端口
- [ ] 配置日志轮转（logrotate）
- [ ] 配置监控告警
