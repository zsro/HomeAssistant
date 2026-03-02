# 家庭计划应用 - 项目 Wiki

## 项目概述

一个面向家庭的综合管理应用，帮助家庭成员协调日程、管理任务，并通过「星星预备班」模块培养孩子良好的晚间习惯。

---

## 技术架构

### 前端
- **框架**: React 18
- **构建工具**: Vite
- **样式**: TailwindCSS
- **状态管理**: React Context / useState
- **路由**: React Router

### 后端
- **框架**: Express.js (Node.js)
- **数据库**: MySQL (通过 Sequelize ORM)
- **认证**: JWT
- **API 风格**: RESTful
- **AI 服务**: 多供应商支持 (火山引擎/OpenAI/Claude/DeepSeek)

---

## 核心功能模块

### 1. 家庭成员管理
- 家庭成员信息维护
- 角色与权限管理
- 家庭组管理

### 2. 日程/任务管理
- 个人与家庭日程
- 任务分配与追踪
- 重复任务设置
- 提醒通知

### 3. 儿童成长模块

#### 3.1 星星预备班
每晚亲子活动的日程规划与行为引导系统。

**功能特性：**
- **活动日程模板**
  - 可自定义的晚间流程模板
  - 预设模板：阅读时间 → 游戏时间 → 洗漱准备 → 睡前故事
  - 拖拽排序调整活动顺序
  
- **活动引导卡片**
  - 图文结合的活动指引
  - 语音播报功能（可选）
  - 步骤分解，帮助孩子独立完成
  
- **完成打卡**
  - 每项活动完成确认
  - 星星奖励机制
  - 连续打卡记录
  
- **进度统计**
  - 每日/周/月完成率
  - 成长趋势图表
  - 成就徽章系统

**使用流程：**
1. 家长配置每日活动流程
2. 晚间按顺序进行各项活动
3. 孩子/家长确认活动完成
4. 获得星星奖励
5. 查看成长报告

### 4. 通知提醒
- 日程到期提醒
- 任务截止提醒
- 星星预备班活动开始提醒
- 推送通知（浏览器/移动端）

---

## 项目结构

```
HomeAssistant/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── components/    # 通用组件
│   │   ├── pages/         # 页面组件
│   │   ├── stores/        # 状态管理
│   │   ├── api/           # API 请求
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── vite.config.js
├── backend/               # 后端项目
│   ├── src/
│   │   ├── routes/        # 路由定义
│   │   ├── models/        # 数据模型
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中间件
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── server.js
└── wiki.md               # 项目文档
```

---

## 数据库模型

### User（用户）
- id, username, email, password, avatar, role, familyId, createdAt

### Family（家庭组）
- id, name, members[], inviteCode, createdAt

### Schedule（日程）
- id, title, description, startTime, endTime, repeat, assignee, familyId

### StarPrepClass（星星预备班）
- id, childId, templates[], records[], settings

### ActivityTemplate（活动模板）
- id, name, icon, duration, guideSteps[], order

### ActivityRecord（活动记录）
- id, childId, date, activities[], starsEarned, completedAt

---

## API 设计

### 认证相关
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh

### 家庭成员
- GET /api/family/members
- POST /api/family/members
- DELETE /api/family/members/:id

### 日程任务
- GET /api/schedules
- POST /api/schedules
- PUT /api/schedules/:id
- DELETE /api/schedules/:id

### 星星预备班
- GET /api/star-prep/templates
- POST /api/star-prep/templates
- GET /api/star-prep/records
- POST /api/star-prep/records
- GET /api/star-prep/stats

---

## 部署指南

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 5.7
- (可选) PM2 进程管理

### 一键部署

```bash
# 1. 克隆代码
git clone <repository-url>
cd HomeAssistant

# 2. 运行部署脚本
./deploy.sh production

# 3. 配置环境变量
vim backend/.env

# 4. 启动服务
pm2 start ecosystem.config.js --env production
```

### 手动部署

#### 后端部署
```bash
cd backend
npm install

# 创建 .env 文件
cp .env.example .env
# 编辑 .env 配置数据库和 AI API

npm start
```

#### 前端部署
```bash
cd frontend
npm install
npm run build

# 将 dist 目录部署到 Web 服务器 (Nginx/Apache)
```

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/HomeAssistant/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 环境变量配置

#### 后端 `.env`
```
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=production

# 数据库配置
USE_REAL_DB=true
DB_HOST=localhost
DB_PORT=3306
DB_NAME=homeAssistantDB
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# AI 配置
AI_PROVIDER=volcano
AI_API_KEY=your-api-key
AI_MODEL=deepseek-v3-2-251201
```

### 数据库初始化

```sql
CREATE DATABASE homeAssistantDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'homeAssistantUser'@'%' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON homeAssistantDB.* TO 'homeAssistantUser'@'%';
FLUSH PRIVILEGES;
```

---

## 开发计划

### Phase 1: 基础搭建 ✅
- [x] 前端项目初始化
- [x] 后端项目初始化
- [x] 数据库配置
- [x] 基础布局组件

### Phase 2: 核心功能 ✅
- [x] 用户认证系统
- [x] 家庭成员管理
- [x] 日程任务管理

### Phase 3: 星星预备班 ✅
- [x] 活动模板管理
- [x] 每日流程界面
- [x] 打卡与奖励系统
- [x] 统计报告
- [x] AI 智能生成模板

### Phase 4: 优化完善
- [ ] 通知提醒
- [ ] UI/UX 优化
- [ ] 性能优化
- [ ] 测试覆盖

---

## 命名规范

- 分支: `feature/xxx`, `fix/xxx`, `docs/xxx`
- 提交: `feat: xxx`, `fix: xxx`, `docs: xxx`, `refactor: xxx`
- 组件: PascalCase (如: ActivityCard)
- 函数: camelCase (如: getActivityList)
- 常量: SCREAMING_SNAKE_CASE
