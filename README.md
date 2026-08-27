# HomeAssistant

HomeAssistant 是一个前后端分离项目：后端使用 TypeScript、Express、Sequelize 和 MySQL，前端位于 `frontend/`。当前后端提供邀请码注册、登录、刷新令牌、退出、修改密码和当前用户接口。

## 项目结构

```text
.
├── database/migrations/   # 版本化数据库迁移
├── scripts/               # 数据库、首用户和运维辅助脚本
├── src/                   # 后端源码
├── tests/                 # 后端自动化测试
├── frontend/              # Web 前端
└── deploy.sh              # 生产发布脚本
```

## 本地开发

运行环境：

- Node.js 20.19 或更高版本
- npm
- MySQL 8；本项目始终连接云端 MySQL，不提供内存数据库模式

复制根目录 `.env.example` 为 `.env`，填入本地连接信息。`.env` 已被 Git 忽略，不得提交或打印数据库密码、JWT 密钥或首用户密码。

```bash
npm ci
npm run db:migrate
npm run dev
```

后端默认监听 `http://127.0.0.1:3001`：

- 健康检查：`GET /api/health`
- 数据库及迁移就绪检查：`GET /api/ready`
- OpenAPI：`GET /api/openapi.json`
- 接口文档：`GET /api/docs`

前端开发：

```bash
cd frontend
npm ci
npm run dev
```

Vite 会输出实际本地地址，通常为 `http://127.0.0.1:5173`。前端通过开发代理访问本地后端。

## API 与鉴权

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `PUT /api/v1/auth/password`
- `GET /api/v1/users/me`

公开注册需要有效邀请码。访问令牌有效期为 15 分钟；刷新令牌有效期为 30 天且每次刷新都会轮换，数据库只保存刷新令牌的 SHA-256 哈希。

## 数据库迁移

生产环境禁止使用 Sequelize `sync()`、`sync({ alter: true })` 或 `sync({ force: true })`。新增表或字段必须添加新的版本化 migration，并与代码一起提交：

```bash
npm run db:migrate
```

Umzug 使用 `ha_schema_migrations` 记录已执行版本。已经应用的 migration 不得修改；新增必填字段应按“先可空、回填、再设非空”的顺序迁移。

首个基线 migration 可以清除旧业务表，但只有显式设置 `ALLOW_LEGACY_RESET=1` 才会执行。该开关仅用于一次性生产初始化或受控测试，不得保存在生产环境文件中。普通发布不会重置数据。

测试数据库名必须以 `_test` 结尾，否则测试迁移和清库脚本会拒绝运行。下面的数据库命令必须使用隔离测试库和测试账号，不得指向 `homeAssistantDB`：

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
DB_NAME=homeAssistantDB_test npm run db:migrate
RUN_DB_TESTS=1 DB_NAME=homeAssistantDB_test npm test
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend run build
```

## 生产基础设施

- 服务器：`root@106.15.230.148`
- 域名：`meiji3d.com`；`www.meiji3d.com` 需有 DNS 解析后才能启用
- Git 源码目录：`/var/HomeAssistant`
- 后端发布根目录：`/var/lib/home-assistant`
- 当前后端：`/var/lib/home-assistant/current`
- 生产环境文件：`/var/lib/home-assistant/shared/backend.env`
- 静态站点：`/var/www/home-assistant`
- Nginx 配置：`/etc/nginx/conf.d/home-assistant.conf`
- PM2 服务名：`home-assistant-backend`
- 后端健康地址：`http://127.0.0.1:3001/api/health`

服务器需要安装 Node.js 20.19+、npm、Git、tar、curl、PM2、MySQL 客户端（含 `mysqldump`）、`gcc-c++`、Nginx 和 Certbot。`gcc-c++` 是安装 Argon2 原生依赖所必需的。

`/var/lib/home-assistant/shared/backend.env` 至少包含数据库连接、监听配置、JWT 和 CORS 配置：

```dotenv
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=homeAssistantDB
DB_USER=homeAssistantUser
DB_PASSWORD=...
JWT_ACCESS_SECRET=...
JWT_ISSUER=...
JWT_AUDIENCE=...
CORS_ORIGINS=https://meiji3d.com
```

环境文件权限必须为 `600`，且不得提交到 Git：

```bash
chmod 600 /var/lib/home-assistant/shared/backend.env
```

## 标准 Git 到生产发布流程

必须先完成 Git 同步，再运行部署。不得直接把本地未提交文件复制到服务器发布。

1. 本地运行适当检查，并确认仅包含预期改动：

   ```bash
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run build
   npm --prefix frontend ci
   npm --prefix frontend run lint
   npm --prefix frontend run build
   git status --short
   ```

2. 只暂存预期文件，创建普通的、非 amend 提交，推送到 `origin/main`，并记录提交哈希：

   ```bash
   git add <intended-files>
   git commit -m "Describe the release"
   git push origin main
   git rev-parse HEAD
   ```

3. 登录服务器，先确认源码目录位于 `main` 且工作树干净。发现脏文件时立即停止，不得擅自删除或覆盖：

   ```bash
   ssh root@106.15.230.148
   cd /var/HomeAssistant
   git branch --show-current
   git status --short
   git pull --ff-only origin main
   git rev-parse HEAD
   git status --short
   ```

4. 确认服务器 `HEAD` 与刚推送的哈希完全一致、工作树仍为空后，从标准源码目录运行部署：

   ```bash
   cd /var/HomeAssistant
   SERVER_NAME=106.15.230.148 ./deploy.sh
   ```

`deploy.sh` 会创建独立 release、安装和构建依赖、默认备份数据库、执行尚未应用的 migration、切换 `current`、重建 PM2 进程、检查后端 readiness、发布前端并验证 HTTPS。migration 失败时不会切换新 release。

部署脚本会先删除同名 PM2 旧进程，再从新 release 创建进程。这一步不能改回简单的 `startOrReload`：PM2 可能保留旧脚本路径，使已删除的旧版本继续运行。

## 一次性破坏性基线迁移

只有在明确决定清除旧业务数据时，才允许设置 `ALLOW_LEGACY_RESET=1`。默认做法会先备份：

```bash
cd /var/HomeAssistant
ALLOW_LEGACY_RESET=1 SERVER_NAME=106.15.230.148 ./deploy.sh
```

如果用户明确要求不备份并接受数据不可恢复，才可以同时跳过备份：

```bash
cd /var/HomeAssistant
SKIP_DATABASE_BACKUP=1 ALLOW_LEGACY_RESET=1 SERVER_NAME=106.15.230.148 ./deploy.sh
```

注意：

- `SKIP_DATABASE_BACKUP=1` 是不可恢复操作的显式确认，不得用于普通发布。
- 破坏性 migration 成功后不得回滚并启动旧应用；旧应用可能按旧结构执行 `sync()`，重新污染数据库。
- `ALLOW_LEGACY_RESET` 只传给这一次命令，不得写入 `backend.env`。
- 当前生产数据库已经完成新结构基线初始化，后续正常发布不需要这两个开关。

## 创建首个用户

首用户只能在 `users` 表为空时创建。生产环境使用隐藏输入脚本，避免密码回显或进入 Shell 历史：

```bash
cd /var/lib/home-assistant/current
./scripts/bootstrap-production-user.sh zsr123456 "加冰"
```

脚本会交互式读取密码，输入时终端不会显示字符。不要把 `BOOTSTRAP_PASSWORD=...` 直接写进命令行。

## 发布后验收

每次发布完成后至少检查：

```bash
pm2 status home-assistant-backend
curl -fsS http://127.0.0.1:3001/api/health
curl -fsS http://127.0.0.1:3001/api/ready
curl -fsS https://meiji3d.com/api/health
curl -fsSI https://meiji3d.com/
cd /var/HomeAssistant
git branch --show-current
git rev-parse HEAD
git status --short
```

预期结果：PM2 状态为 `online`，健康和就绪接口成功，Nginx 前后端转发正常，服务器仍位于 `main`、提交哈希一致且工作树为空。不要使用 `curl -k` 跳过证书校验，否则过期或错误证书会被误判为发布成功。

证书运维检查：

```bash
systemctl status certbot-renew.timer
certbot renew --dry-run
```

如果续期后需要重新加载 Nginx，应保留 `/etc/letsencrypt/renewal-hooks/deploy/` 下的 reload hook。只有当 `www.meiji3d.com` 已正确解析到服务器后，才能把它加入证书和 Nginx server name。
