# HomeAssistant

家庭协作应用，当前主要包含两个功能域：

- 家庭管理：注册、登录、创建/加入家庭、查看成员
- 星星预备班：AI 生成一周亲子活动模板、今日活动、日历打卡、统计

## 技术栈

- 前端：React 19、Vite、React Router、Zustand、Tailwind
- 后端：Express、JWT、Sequelize
- 数据层：支持内存模式和 MySQL 模式
- AI：支持 `mock`、`volcano`、`openai`、`claude`、`deepseek`

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

- `USE_REAL_DB=false`：使用内存数据，适合本地快速启动
- `USE_REAL_DB=true`：使用 MySQL，并补齐 `DB_*` 配置
- `AI_PROVIDER=mock`：不接入真实模型，适合联调

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

- 后端接口已覆盖家庭管理和星星预备班核心流程
- 前端已完成登录注册、家庭页、活动页、日历页和 AI 模板生成
- 生产部署脚本见 [deploy.sh](/Users/zsr/HomeAssistant/deploy.sh)

## 最近整理方向

- 抽离了前后端日期与序列化公共逻辑
- 统一了前端 token 访问与流式请求入口
- 修复了内存模式启动、家庭更新、打卡日期范围查询等结构性问题
- 后端进一步整理为 `routes -> controllers -> services`，降低路由层耦合
