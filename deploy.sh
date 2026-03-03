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

echo -e "${YELLOW}[1/9] 检查依赖...${NC}"
check_command node
check_command npm
check_command git
echo -e "${GREEN}✓ 依赖检查通过${NC}"
echo ""

# 进入项目目录
cd "$SCRIPT_DIR"

# 安装后端依赖
echo -e "${YELLOW}[2/9] 安装后端依赖...${NC}"
cd backend
npm install
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
echo ""

# 安装前端依赖
echo -e "${YELLOW}[3/9] 安装前端依赖...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install
echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
echo ""

# 构建前端
echo -e "${YELLOW}[4/9] 构建前端...${NC}"
npm run build
echo -e "${GREEN}✓ 前端构建完成${NC}"
echo ""

# 检查构建输出
if [ ! -d "$SCRIPT_DIR/frontend/dist" ]; then
    echo -e "${RED}错误: 前端构建失败，dist 目录不存在${NC}"
    exit 1
fi

# 部署前端到 Nginx
echo -e "${YELLOW}[5/9] 部署前端到 Nginx...${NC}"
if command -v nginx &> /dev/null; then
    # 检测 Nginx 配置目录风格
    if [ -d "/etc/nginx/conf.d" ]; then
        # Alibaba Cloud Linux / CentOS / RHEL 风格
        NGINX_CONF_DIR="/etc/nginx/conf.d"
        NGINX_CONF_FILE="$NGINX_CONF_DIR/home-assistant.conf"
    else
        # Debian / Ubuntu 风格
        NGINX_CONF_DIR="/etc/nginx/sites-available"
        sudo mkdir -p /etc/nginx/sites-available
        sudo mkdir -p /etc/nginx/sites-enabled
        NGINX_CONF_FILE="$NGINX_CONF_DIR/home-assistant"
    fi
    
    echo -e "${YELLOW}使用 Nginx 配置目录: $NGINX_CONF_DIR${NC}"
    
    # 创建 Nginx 配置
    sudo tee $NGINX_CONF_FILE << 'EOF'
server {
    listen 80;
    server_name _;  # 监听所有域名
    
    # 后端 API 代理 - 放在前面优先匹配
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 后端连接设置
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # 错误处理
        proxy_intercept_errors on;
        error_page 502 503 504 = @backend_error;
    }
    
    # 后端错误页面
    location @backend_error {
        return 503 '{"error": "后端服务不可用，请检查服务状态"}';
        add_header Content-Type application/json;
    }
    
    # 前端静态文件
    location / {
        root /var/www/home-assistant;
        try_files $uri $uri/ /index.html;
        index index.html;
    }
}
EOF
    
    # 对于 Debian/Ubuntu 风格，创建软链接
    if [ "$NGINX_CONF_DIR" = "/etc/nginx/sites-available" ]; then
        sudo ln -sf /etc/nginx/sites-available/home-assistant /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
    fi
    
    # 创建网站目录
    sudo mkdir -p /var/www/home-assistant
    
    # 清空旧文件
    sudo rm -rf /var/www/home-assistant/*
    
    # 复制构建后的文件
    sudo cp -r "$SCRIPT_DIR/frontend/dist/"* /var/www/home-assistant/
    sudo chown -R nginx:nginx /var/www/home-assistant 2>/dev/null || sudo chown -R www-data:www-data /var/www/home-assistant
    
    # 验证文件
    echo -e "${YELLOW}部署的文件列表:${NC}"
    ls -la /var/www/home-assistant/ | head -10
    
    # 测试并重载 Nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    echo -e "${GREEN}✓ 前端已部署到 Nginx (http://服务器IP)${NC}"
else
    echo -e "${YELLOW}警告: Nginx 未安装，跳过前端部署${NC}"
    echo -e "${YELLOW}请手动安装 Nginx 并配置前端目录: frontend/dist${NC}"
fi
echo ""

# 检查环境变量文件
echo -e "${YELLOW}[6/9] 检查环境变量...${NC}"
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
DB_PASSWORD=yingzi123

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
echo -e "${YELLOW}[7/9] 创建 PM2 配置...${NC}"

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME-backend',
      cwd: '$SCRIPT_DIR/backend',
      script: '$SCRIPT_DIR/backend/server.js',
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
echo -e "${YELLOW}[8/9] 配置进程管理...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
fi

# 启动服务
echo ""
echo -e "${YELLOW}[9/9] 启动服务...${NC}"
echo ""

# 检查后端服务是否已在运行
if pm2 list | grep -q "$PROJECT_NAME-backend"; then
    echo -e "${YELLOW}后端服务已在运行，正在重启...${NC}"
    pm2 restart ecosystem.config.js --env production
else
    echo -e "${YELLOW}正在启动后端服务...${NC}"
    pm2 start ecosystem.config.js --env production
fi

echo -e "${GREEN}✓ 后端服务已启动${NC}"
echo ""

# 等待服务启动
sleep 3

# 健康检查
echo -e "${YELLOW}检查服务健康状态...${NC}"
if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务健康检查通过${NC}"
elif curl -s http://127.0.0.1:3001/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务响应正常${NC}"
else
    echo -e "${YELLOW}警告: 后端服务可能未完全启动，请检查日志: pm2 logs${NC}"
fi

echo ""
echo -e "${YELLOW}访问地址:${NC}"
echo "  前端: http://$(hostname -I | awk '{print $1}')"
echo "  后端 API: http://$(hostname -I | awk '{print $1}'):3001"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}服务地址:${NC}"
echo "  前端: http://服务器IP"
echo "  后端 API: http://服务器IP:3001"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  pm2 status              # 查看服务状态"
echo "  pm2 logs $PROJECT_NAME-backend  # 查看后端日志"
echo "  pm2 restart $PROJECT_NAME-backend # 重启后端"
echo "  pm2 stop $PROJECT_NAME-backend    # 停止后端"
echo "  sudo systemctl reload nginx       # 重载 Nginx"
echo ""
echo -e "${YELLOW}文件位置:${NC}"
echo "  前端目录: /var/www/home-assistant"
echo "  Nginx 配置: /etc/nginx/sites-available/home-assistant"
echo ""
echo -e "${GREEN}部署完成！${NC}"
