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
RELEASE_ID="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$RELEASES_DIR/release-$RELEASE_ID"
PREVIOUS_RELEASE=""

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

for command in node npm git tar pm2 mysqldump curl; do
  command -v "$command" >/dev/null 2>&1 || { echo "错误: 缺少 $command"; exit 1; }
done

if [ ! -f "$ENV_FILE" ]; then
  echo "错误: 缺少生产环境文件 $ENV_FILE"
  exit 1
fi

mkdir -p "$RELEASES_DIR" "$SHARED_DIR" "$BACKUP_DIR" "$LOG_DIR"
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

mkdir -p "$BACKUP_DIR"
(
  cd "$RELEASE_DIR"
  ENV_FILE="$ENV_FILE" BACKUP_DIR="$BACKUP_DIR" node dist/scripts/backup-database.js
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

if ! pm2 startOrReload "$PM2_CONFIG" --env production --update-env; then
  echo "错误: PM2 启动新版本失败"
  if [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    pm2 startOrReload "$PM2_CONFIG" --env production --update-env || true
  fi
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
  if [ -n "$PREVIOUS_RELEASE" ]; then
    ln -sfn "$PREVIOUS_RELEASE" "$CURRENT_LINK"
    pm2 startOrReload "$PM2_CONFIG" --env production --update-env || true
  fi
  exit 1
fi

pm2 save

find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -name 'release-*' -printf '%T@ %p\n' \
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
