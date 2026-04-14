# HomeAssistant

家庭协作应用，当前主要包含以下功能：

- 家庭管理：注册、登录、创建/加入家庭、查看成员
- 中文拼音学习：覆盖小学 1-3 年级拼音内容，支持进度记录
- 展示端 / 控制端：电视或投影配对展示，手机端实时控制内容切换

## 技术栈

- 前端：React 19、Vite、React Router、Zustand、Tailwind
- 后端：Express、JWT、Sequelize
- 数据层：统一连接云端 MySQL

## 目录结构

```text
HomeAssistant/
├── package.json
├── backend/
│   ├── server.js
│   ├── scripts/
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       ├── stores/
│       └── utils/
├── deploy.sh
└── wiki.md
```

## 本地运行

### 1. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

默认端口为 `3001`。

`.env` 关键项：

- `DB_HOST`：云端数据库地址
- `DB_PORT`：数据库端口，默认 `3306`
- `DB_NAME` / `DB_USER` / `DB_PASSWORD`：云端数据库连接凭据

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认端口为 Vite 的本地开发端口，开发环境下会请求 `http://localhost:3001/api`。

### 3. 从根目录统一启动

```bash
npm run dev
```

常用脚本：

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run build`
- `npm run lint`

## 当前实现重点

- 后端接口已覆盖家庭管理、拼音学习和展示端控制核心流程
- 前端已完成登录注册、家庭页、拼音学习页和展示端控制页
- 生产部署脚本见 [deploy.sh](/Users/zsr/HomeAssistant/deploy.sh)
- 生产服务器 Git 源码目录固定为 `/var/HomeAssistant`
- 当前运行版本目录为 `/var/lib/home-assistant/current`
- 历史版本目录为 `/var/lib/home-assistant/releases`
- 共享环境文件为 `/var/lib/home-assistant/shared/backend.env`
- 前端静态目录固定为 `/var/www/home-assistant`

## 最近整理方向

- 抽离了前后端日期与序列化公共逻辑
- 统一了前端 token 访问与流式请求入口
- 修复了数据库连接、家庭更新、打卡日期范围查询等结构性问题
- 后端进一步整理为 `routes -> controllers -> services`，降低路由层耦合
