#!/bin/bash

# 家庭计划应用 - 一键部署脚本
# 使用方法: ./deploy.sh [环境]
# 环境选项: production (默认) | development

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="home-assistant"
ENV=${1:-production}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  家庭计划应用 - 一键部署脚本${NC}"
echo -e "${GREEN}  环境: $ENV${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查必要命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: $1 未安装${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}[1/7] 检查依赖...${NC}"
check_command node
check_command npm
check_command git
echo -e "${GREEN}✓ 依赖检查通过${NC}"
echo ""

# 进入项目目录
cd "$SCRIPT_DIR"

# 安装后端依赖
echo -e "${YELLOW}[2/7] 安装后端依赖...${NC}"
cd backend
npm install
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
echo ""

# 安装前端依赖
echo -e "${YELLOW}[3/7] 安装前端依赖...${NC}"
cd ../frontend
npm install
echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
echo ""

# 构建前端
echo -e "${YELLOW}[4/7] 构建前端...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 检查环境变量文件
echo -e "${YELLOW}[5/7] 检查环境变量...${NC}"
cd ..

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}警告: backend/.env 文件不存在，创建默认配置...${NC}"
    cat > backend/.env << 'EOF'
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production

# 数据库配置
USE_REAL_DB=true
DB_HOST=localhost
DB_PORT=3306
DB_NAME=homeAssistantDB
DB_USER=homeAssistantUser
DB_PASSWORD=your-password

# AI 配置
AI_PROVIDER=volcano
AI_API_KEY=your-api-key
AI_MODEL=deepseek-v3-2-251201
EOF
    echo -e "${YELLOW}请编辑 backend/.env 文件，修改数据库和 AI 配置${NC}"
fi

echo -e "${GREEN}✓ 环境变量检查完成${NC}"
echo ""

# 创建 PM2 配置文件
echo -e "${YELLOW}[6/7] 创建 PM2 配置...${NC}"

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      log_file: './logs/backend.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
EOF

# 创建日志目录
mkdir -p logs

echo -e "${GREEN}✓ PM2 配置创建完成${NC}"
echo ""

# 检查 PM2
echo -e "${YELLOW}[7/7] 配置进程管理...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署准备完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}后续步骤:${NC}"
echo ""
echo "1. 编辑后端配置:"
echo "   vim backend/.env"
echo ""
echo "2. 启动后端服务:"
echo "   cd backend && npm start"
echo "   或使用 PM2: pm2 start ecosystem.config.js --env production"
echo ""
echo "3. 启动前端开发服务器 (开发环境):"
echo "   cd frontend && npm run dev"
echo ""
echo "4. 生产环境前端部署:"
echo "   将 frontend/dist 目录部署到 Nginx/Apache"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  pm2 status              # 查看服务状态"
echo "  pm2 logs $PROJECT_NAME-backend  # 查看后端日志"
echo "  pm2 restart $PROJECT_NAME-backend # 重启后端"
echo "  pm2 stop $PROJECT_NAME-backend    # 停止后端"
echo ""
echo -e "${GREEN}部署完成！${NC}"
