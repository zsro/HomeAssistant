#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "用法: $0 <username> <display-name>"
  exit 1
fi

if [ ! -t 0 ]; then
  echo "错误: 必须从交互式终端读取首用户密码"
  exit 1
fi

ENV_FILE="${ENV_FILE:-/var/lib/home-assistant/shared/backend.env}"

restore_terminal() {
  stty echo 2>/dev/null || true
  printf '\n'
}

printf "请输入首用户密码: "
stty -echo
trap restore_terminal EXIT
IFS= read -r bootstrap_password
restore_terminal
trap - EXIT

if [ -z "$bootstrap_password" ]; then
  echo "错误: 密码不能为空"
  exit 1
fi

BOOTSTRAP_USERNAME="$1" \
BOOTSTRAP_DISPLAY_NAME="$2" \
BOOTSTRAP_PASSWORD="$bootstrap_password" \
ENV_FILE="$ENV_FILE" \
npm run bootstrap:user

unset bootstrap_password
