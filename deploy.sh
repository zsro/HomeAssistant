#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="home-assistant-backend"
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/lib/home-assistant}"
RELEASES_DIR="$DEPLOY_ROOT/releases"
CURRENT_LINK="$DEPLOY_ROOT/current"
SHARED_DIR="$DEPLOY_ROOT/shared"
ENV_FILE="$SHARED_DIR/backend.env"
BACKUP_DIR="$DEPLOY_ROOT/backups"
LOG_DIR="$DEPLOY_ROOT/logs"
PM2_CONFIG="$DEPLOY_ROOT/ecosystem.config.js"
STATIC_ROOT="${STATIC_ROOT:-/var/www/home-assistant}"
STATIC_RELEASES_DIR="${STATIC_RELEASES_DIR:-/var/www/home-assistant-releases}"
RELEASE_ID="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$RELEASES_DIR/release-$RELEASE_ID"
STATIC_RELEASE_DIR="$STATIC_RELEASES_DIR/release-$RELEASE_ID"
PREVIOUS_RELEASE=""
PREVIOUS_STATIC_RELEASE=""

if [ "$SCRIPT_DIR" != "/var/HomeAssistant" ]; then
  echo "错误: 只能从 /var/HomeAssistant 执行生产部署"
  exit 1
fi

if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]; then
  echo "错误: 服务器源码目录不干净，停止部署"
  git -C "$SCRIPT_DIR" status --short
  exit 1
fi

if [ "$(git -C "$SCRIPT_DIR" branch --show-current)" != "main" ]; then
  echo "错误: 服务器源码必须位于 main 分支"
  exit 1
fi

for command in node npm git tar pm2 mysqldump curl g++ nginx; do
  command -v "$command" >/dev/null 2>&1 || { echo "错误: 缺少 $command"; exit 1; }
done

if ! id nginx >/dev/null 2>&1; then
  echo "错误: 缺少 nginx 系统用户"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "错误: 缺少生产环境文件 $ENV_FILE"
  exit 1
fi

mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$BACKUP_DIR" "$LOG_DIR" "$STATIC_RELEASES_DIR"
mkdir -p "$RELEASE_DIR"

tar \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.env \
  -C "$SCRIPT_DIR" -cf - . | tar -xf - -C "$RELEASE_DIR"

ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"
npm --prefix "$RELEASE_DIR" ci
npm --prefix "$RELEASE_DIR" run build
npm --prefix "$RELEASE_DIR/frontend" ci
npm --prefix "$RELEASE_DIR/frontend" run build

mkdir -p "$STATIC_RELEASE_DIR"
cp -a "$RELEASE_DIR/frontend/dist/." "$STATIC_RELEASE_DIR/"
if [ ! -f "$STATIC_RELEASE_DIR/index.html" ]; then
  echo "错误: 前端构建缺少 index.html"
  exit 1
fi
chown -R nginx:nginx "$STATIC_RELEASE_DIR"

mkdir -p "$BACKUP_DIR"
(
  cd "$RELEASE_DIR"
  if [ "${SKIP_DATABASE_BACKUP:-0}" = "1" ]; then
    echo "警告: 已按显式配置跳过数据库备份"
  else
    ENV_FILE="$ENV_FILE" BACKUP_DIR="$BACKUP_DIR" node dist/scripts/backup-database.js
  fi
  ENV_FILE="$ENV_FILE" node dist/src/database/migrate.js
)

if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

cat > "$PM2_CONFIG" <<EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
    cwd: '$CURRENT_LINK',
    script: '$CURRENT_LINK/dist/src/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: { NODE_ENV: 'production', ENV_FILE: '$ENV_FILE' },
    out_file: '$LOG_DIR/backend-out.log',
    error_file: '$LOG_DIR/backend-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

start_backend() {
  pm2 delete "$PROJECT_NAME" >/dev/null 2>&1 || true
  pm2 start "$PM2_CONFIG" --env production --update-env
}

rollback_backend() {
  pm2 delete "$PROJECT_NAME" >/dev/null 2>&1 || true
  if [ "${ALLOW_LEGACY_RESET:-0}" != "1" ] && [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    pm2 start "$PM2_CONFIG" --env production --update-env || true
  fi
}

if ! start_backend; then
  echo "错误: PM2 启动新版本失败"
  rollback_backend
  exit 1
fi

health_ok=false
for _ in {1..15}; do
  if curl -sSf http://127.0.0.1:3001/api/ready >/dev/null 2>&1; then
    health_ok=true
    break
  fi
  sleep 2
done

if [ "$health_ok" != true ]; then
  echo "错误: 新版本就绪检查失败"
  rollback_backend
  exit 1
fi

pm2 save

if [ -L "$STATIC_ROOT" ]; then
  PREVIOUS_STATIC_RELEASE="$(readlink -f "$STATIC_ROOT")"
elif [ -d "$STATIC_ROOT" ]; then
  PREVIOUS_STATIC_RELEASE="$STATIC_RELEASES_DIR/release-legacy-$RELEASE_ID"
  mv "$STATIC_ROOT" "$PREVIOUS_STATIC_RELEASE"
elif [ -e "$STATIC_ROOT" ]; then
  echo "错误: 静态站点路径既不是目录也不是符号链接: $STATIC_ROOT"
  exit 1
fi

ln -sfn "$STATIC_RELEASE_DIR" "$STATIC_ROOT"

frontend_ok=false
for _ in {1..10}; do
  if curl -sSf --resolve meiji3d.com:443:127.0.0.1 https://meiji3d.com/ \
    | grep -q 'Home Assistant · 账户中心'; then
    frontend_ok=true
    break
  fi
  sleep 1
done

if [ "$frontend_ok" != true ]; then
  echo "错误: 新前端访问检查失败"
  if [ -n "$PREVIOUS_STATIC_RELEASE" ]; then
    ln -sfn "$PREVIOUS_STATIC_RELEASE" "$STATIC_ROOT"
  else
    rm -f "$STATIC_ROOT"
  fi
  exit 1
fi

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' -printf '%T@ %p\n' \
  | sort -rn \
  | awk 'NR > 3 { print $2 }' \
  | while IFS= read -r old_release; do rm -rf "$old_release"; done

find "$STATIC_RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' -printf '%T@ %p\n' \
  | sort -rn \
  | awk 'NR > 3 { print $2 }' \
  | while IFS= read -r old_release; do rm -rf "$old_release"; done

if [ -n "$(git -C "$SCRIPT_DIR" status --porcelain)" ]; then
  echo "错误: 部署后服务器源码目录发生变化"
  exit 1
fi

echo "部署成功"
echo "commit=$(git -C "$SCRIPT_DIR" rev-parse HEAD)"
echo "release=$RELEASE_DIR"
echo "static_release=$STATIC_RELEASE_DIR"
