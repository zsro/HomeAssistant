# HomeAssistant Backend

基于 TypeScript、Express 5、Sequelize 和 MySQL 8 的邀请制用户后端。公开注册必须使用已有用户的邀请码；每位用户拥有一个长期可复用的唯一邀请码。

## 本地配置

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run bootstrap:user
npm run dev
```

数据库始终使用云端 MySQL，不提供内存数据库模式。本地 `.env` 不会提交到 Git。首次面对旧数据库结构运行 migration 前必须完成备份，并临时设置：

```text
ALLOW_LEGACY_RESET=1
```

首次 migration 完成后立即恢复为 `0`。生产环境禁止使用 Sequelize `sync()` 自动修改结构；所有表和字段变更都必须提交新的 `database/migrations/` 文件。

## 常用命令

- `npm run dev`：开发模式启动
- `npm run build` / `npm start`：构建和运行生产产物
- `npm run lint` / `npm run typecheck` / `npm test`：质量检查
- `npm run db:migrate`：应用未执行的 migration
- `npm run db:migrate:status`：查看 migration 状态
- `npm run bootstrap:user`：仅在空 `users` 表中创建首用户

服务默认监听 `3001`：

- 健康检查：`GET /api/health`
- 就绪检查：`GET /api/ready`
- OpenAPI：`GET /api/openapi.json`
- Swagger UI：`GET /api/docs`

## API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `PUT /api/v1/auth/password`
- `GET /api/v1/users/me`

访问令牌有效期 15 分钟；刷新令牌有效期 30 天且每次刷新都会轮换。数据库只保存刷新令牌的 SHA-256 哈希。

## 测试数据库

集成测试只允许连接名称以 `_test` 结尾的独立 MySQL 数据库：

```bash
RUN_DB_TESTS=1 DB_NAME=homeAssistantDB_test npm test
```

测试代码在执行清理前会再次校验数据库名，绝不会使用生产数据库。

## 生产发布

发布必须依次完成：本地检查和提交、推送 `origin/main`、服务器 `/var/HomeAssistant` 检查干净状态、`git pull --ff-only origin main`、核对提交一致，然后执行：

```bash
cd /var/HomeAssistant
SERVER_NAME=106.15.230.148 ./deploy.sh
```

部署脚本会构建独立 release、创建压缩数据库备份、应用 migration、切换 `current`、重启 PM2，并通过 `/api/ready` 验证新版本。migration 失败时不会切换 release 或重启当前服务。
