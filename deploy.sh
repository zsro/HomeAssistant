#!/bin/bash

# 家庭计划应用 - 一键部署脚本
# 使用方法: ./deploy.sh [环境]
# 环境选项: production (默认) | development
#
# 目录约定
# - Git 源码目录: /var/HomeAssistant
# - 后端发布目录: /var/lib/home-assistant/current
# - 后端历史版本: /var/lib/home-assistant/releases
# - 后端共享配置: /var/lib/home-assistant/shared/backend.env
# - 后端日志目录: /var/lib/home-assistant/logs
# - 控制端静态目录: /var/www/home-assistant
# - 展示端静态目录: /var/www/home-assistant/display

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="home-assistant"
ENV="${1:-production}"
SERVER_NAME="${SERVER_NAME:-_}"

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/lib/home-assistant}"
RELEASES_DIR="$DEPLOY_ROOT/releases"
CURRENT_LINK="$DEPLOY_ROOT/current"
SHARED_DIR="$DEPLOY_ROOT/shared"
LOG_DIR="$DEPLOY_ROOT/logs"
PM2_CONFIG="$DEPLOY_ROOT/ecosystem.config.js"
ENV_FILE="$SHARED_DIR/backend.env"
WEB_ROOT="${WEB_ROOT:-/var/www/home-assistant}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
RELEASE_ID="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$RELEASES_DIR/release-$RELEASE_ID"
SOURCE_GIT_STATUS_BEFORE=""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  家庭计划应用 - 一键部署脚本${NC}"
echo -e "${GREEN}  环境: $ENV${NC}"
echo -e "${GREEN}  源码目录: $SCRIPT_DIR${NC}"
echo -e "${GREEN}  发布目录: $DEPLOY_ROOT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

check_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo -e "${RED}错误: $1 未安装${NC}"
        exit 1
    fi
}

run_npm_install() {
    local target_dir="$1"

    if [ -f "$target_dir/package-lock.json" ]; then
        npm --prefix "$target_dir" ci
    else
        npm --prefix "$target_dir" install
    fi
}

cleanup_old_releases() {
    mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' | sort -r)

    if [ "${#releases[@]}" -le "$KEEP_RELEASES" ]; then
        return
    fi

    for old_release in "${releases[@]:$KEEP_RELEASES}"; do
        rm -rf "$old_release"
    done
}

capture_source_git_status() {
    if [ -d "$SCRIPT_DIR/.git" ]; then
        git -C "$SCRIPT_DIR" status --porcelain
    fi
}

assert_source_tree_unchanged() {
    if [ ! -d "$SCRIPT_DIR/.git" ]; then
        return
    fi

    local current_status
    current_status="$(capture_source_git_status)"

    if [ "$current_status" != "$SOURCE_GIT_STATUS_BEFORE" ]; then
        echo -e "${RED}错误: 部署过程中检测到源码目录发生变化: $SCRIPT_DIR${NC}"
        echo -e "${YELLOW}部署前状态:${NC}"
        printf '%s\n' "$SOURCE_GIT_STATUS_BEFORE"
        echo -e "${YELLOW}部署后状态:${NC}"
        printf '%s\n' "$current_status"
        exit 1
    fi
}

echo -e "${YELLOW}[1/10] 检查依赖...${NC}"
check_command node
check_command npm
check_command git
check_command tar
check_command curl
SOURCE_GIT_STATUS_BEFORE="$(capture_source_git_status)"
echo -e "${GREEN}✓ 依赖检查通过${NC}"
echo ""

echo -e "${YELLOW}[2/10] 准备发布目录...${NC}"
mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$LOG_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
echo -e "${GREEN}✓ 发布目录准备完成${NC}"
echo ""

echo -e "${YELLOW}[3/10] 复制源码到独立发布目录...${NC}"
tar \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=frontend/node_modules \
    --exclude=display-frontend/node_modules \
    --exclude=backend/node_modules \
    --exclude=frontend/dist \
    --exclude=display-frontend/dist \
    --exclude=logs \
    --exclude=backend/logs \
    --exclude=ecosystem.config.js \
    --exclude=backend/.env \
    -C "$SCRIPT_DIR" \
    -cf - . | tar -xf - -C "$RELEASE_DIR"
echo -e "${GREEN}✓ 源码复制完成${NC}"
echo ""

echo -e "${YELLOW}[4/10] 安装后端依赖到发布目录...${NC}"
run_npm_install "$RELEASE_DIR/backend"
echo -e "${GREEN}✓ 后端依赖安装完成${NC}"
echo ""

echo -e "${YELLOW}[5/10] 安装控制端与展示端依赖并构建...${NC}"
run_npm_install "$RELEASE_DIR/frontend"
npm --prefix "$RELEASE_DIR/frontend" run build
run_npm_install "$RELEASE_DIR/display-frontend"
npm --prefix "$RELEASE_DIR/display-frontend" run build
echo -e "${GREEN}✓ 控制端与展示端构建完成${NC}"
echo ""

if [ ! -d "$RELEASE_DIR/frontend/dist" ]; then
    echo -e "${RED}错误: 控制端构建失败，frontend/dist 目录不存在${NC}"
    exit 1
fi

if [ ! -d "$RELEASE_DIR/display-frontend/dist" ]; then
    echo -e "${RED}错误: 展示端构建失败，display-frontend/dist 目录不存在${NC}"
    exit 1
fi

echo -e "${YELLOW}[6/10] 部署控制端与展示端静态文件到 Nginx 目录...${NC}"
if command -v nginx >/dev/null 2>&1; then
    if [ -d "/etc/nginx/conf.d" ]; then
        NGINX_CONF_DIR="/etc/nginx/conf.d"
        NGINX_CONF_FILE="$NGINX_CONF_DIR/home-assistant.conf"
    else
        NGINX_CONF_DIR="/etc/nginx/sites-available"
        sudo mkdir -p /etc/nginx/sites-available
        sudo mkdir -p /etc/nginx/sites-enabled
        NGINX_CONF_FILE="$NGINX_CONF_DIR/home-assistant"
    fi

    echo -e "${YELLOW}使用 Nginx 配置目录: $NGINX_CONF_DIR${NC}"

    sudo tee "$NGINX_CONF_FILE" > /dev/null << EOF
server {
    listen 80;
    server_name __SERVER_NAME__;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        proxy_intercept_errors on;
        error_page 502 503 504 = @backend_error;
    }

    location /ws/display {
        proxy_pass http://127.0.0.1:3001/ws/display;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    location @backend_error {
        return 503 '{"error": "后端服务不可用，请检查服务状态"}';
        add_header Content-Type application/json;
    }

    location /display/assets/ {
        root $WEB_ROOT;
        try_files \$uri =404;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /display {
        return 301 /display/;
    }

    location /display/ {
        root $WEB_ROOT;
        try_files \$uri \$uri/ /display/index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    location /assets/ {
        root $WEB_ROOT;
        try_files \$uri =404;
        access_log off;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        root $WEB_ROOT;
        try_files \$uri =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    location = /vite.svg {
        root $WEB_ROOT;
        try_files \$uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    location / {
        root $WEB_ROOT;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
}
EOF
    sudo sed -i "s/__SERVER_NAME__/${SERVER_NAME}/g" "$NGINX_CONF_FILE"

    if [ "$NGINX_CONF_DIR" = "/etc/nginx/sites-available" ]; then
        sudo ln -sf /etc/nginx/sites-available/home-assistant /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
    else
        sudo rm -f /etc/nginx/conf.d/default.conf
    fi

    sudo mkdir -p "$WEB_ROOT"
    sudo rm -rf "$WEB_ROOT"/*
    sudo cp -r "$RELEASE_DIR/frontend/dist/"* "$WEB_ROOT/"
    sudo mkdir -p "$WEB_ROOT/display"
    sudo cp -r "$RELEASE_DIR/display-frontend/dist/"* "$WEB_ROOT/display/"
    sudo chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || sudo chown -R www-data:www-data "$WEB_ROOT"

    echo -e "${YELLOW}部署的静态文件:${NC}"
    ls -la "$WEB_ROOT" | head -10

    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✓ 控制端与展示端静态文件部署完成${NC}"
else
    echo -e "${YELLOW}警告: Nginx 未安装，跳过控制端与展示端静态文件部署${NC}"
fi
echo ""

echo -e "${YELLOW}[7/10] 准备共享环境配置...${NC}"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << 'EOF'
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=homeAssistantDB
DB_USER=homeAssistantUser
DB_PASSWORD=yingzi123
EOF
    echo -e "${YELLOW}警告: 已创建默认环境文件 $ENV_FILE，请按实际环境修改${NC}"
fi

ln -sfn "$ENV_FILE" "$RELEASE_DIR/backend/.env"
echo -e "${GREEN}✓ 环境配置检查完成${NC}"
echo ""

echo -e "${YELLOW}[8/10] 生成 PM2 配置并切换当前版本...${NC}"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

cat > "$PM2_CONFIG" << EOF
module.exports = {
  apps: [
    {
      name: '$PROJECT_NAME-backend',
      cwd: '$CURRENT_LINK/backend',
      script: '$CURRENT_LINK/backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      log_file: '$LOG_DIR/backend-combined.log',
      out_file: '$LOG_DIR/backend-out.log',
      error_file: '$LOG_DIR/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
EOF
echo -e "${GREEN}✓ PM2 配置生成完成${NC}"
echo ""

echo -e "${YELLOW}[9/10] 启动或重启后端服务...${NC}"
if command -v pm2 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PM2 已安装${NC}"
else
    echo -e "${YELLOW}PM2 未安装，正在安装...${NC}"
    npm install -g pm2
    echo -e "${GREEN}✓ PM2 安装完成${NC}"
fi

if pm2 describe "$PROJECT_NAME-backend" >/dev/null 2>&1; then
    pm2 delete "$PROJECT_NAME-backend"
fi

pm2 start "$PM2_CONFIG" --env production
echo -e "${GREEN}✓ 后端服务已启动${NC}"
echo ""

echo -e "${YELLOW}[10/10] 健康检查与清理旧版本...${NC}"
health_ok=false
for _ in {1..10}; do
    if curl -sSf http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
        health_ok=true
        break
    fi
    sleep 2
done

if [ "$health_ok" = true ]; then
    echo -e "${GREEN}✓ 后端服务健康检查通过${NC}"
else
    echo -e "${YELLOW}警告: 后端服务可能未完全启动，请检查日志: pm2 logs $PROJECT_NAME-backend${NC}"
fi

cleanup_old_releases
assert_source_tree_unchanged
echo -e "${GREEN}✓ 旧版本清理完成${NC}"
echo ""

echo -e "${YELLOW}访问地址:${NC}"
echo "  前端: http://$(hostname -I | awk '{print $1}')"
echo "  后端 API: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo -e "${YELLOW}目录布局:${NC}"
echo "  Git 源码目录: $SCRIPT_DIR"
echo "  当前后端版本: $CURRENT_LINK"
echo "  历史版本目录: $RELEASES_DIR"
echo "  共享环境文件: $ENV_FILE"
echo "  后端日志目录: $LOG_DIR"
echo "  控制端静态目录: $WEB_ROOT"
echo "  展示端静态目录: $WEB_ROOT/display"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
