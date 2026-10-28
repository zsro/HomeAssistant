# 前端本地构建与 Git 产物发布

> 文档整理（2026-10-19）：本页保留阶段记录/专项参考，历史状态与下一步不代表当前排期。现状见[项目总览](README.md)，后续任务见[路线图](../richman-roadmap.md)。

发布范围仍为日本地图v47、十五种policy及S3 Web/Chrome候选。`/modules/richman`使用现有登录鉴权；没有新增数据库迁移/存档，刷新或离开会丢失临时对局。原版差异、未测设备与未触发音频场景见S3-05c矩阵。

## 当前发布流程

1. 本地安装依赖、运行适当检查，执行`npm run release:frontend`。命令先核验本地39个游戏资源，再运行前端类型检查和Vite生产构建。成功后将运行产物写入`release/frontend/`，清单写入`release/frontend-manifest.json`。本地素材源仍在忽略目录`frontend/public/richman/generated/`；contact sheet等导出诊断图不进入发布包。
2. 执行`npm run release:verify`。校验完整文件集合、大小、SHA256、入口及39项游戏素材，并核对当前前端源码指纹。源码与产物须一起提交；指纹不包含Git提交ID，避免循环依赖。打包后再修改前端源码或打包脚本须重新生成。当前不支持前端生产`.env`文件或`VITE_*`环境覆盖，后端生产环境文件不受影响。
3. 提交源代码、`release/frontend/`和清单，推送`origin main`；产物及素材正式纳入Git历史，未来版本只保留当前目录，Git保存历史。不得提交`.env`或原安装包。
4. 服务器检查`/var/HomeAssistant`位于main且工作区干净，执行`git pull --ff-only origin main`，确认HEAD等于本地推送提交且仍干净。
5. 从规范源码目录运行`SERVER_NAME=106.15.230.148 ./deploy.sh`。脚本在创建release、安装依赖或修改服务前验证已提交前端包。服务器继续构建后端、备份数据库、执行迁移及健康/回退检查；前端直接复制Git中的`release/frontend/`，不运行前端npm ci、TypeScript或Vite，不再单独上传素材。
6. 检查PM2、health/ready、Nginx/HTTPS游戏入口与资源、静态首页哈希、服务器最终Git状态。可执行`node scripts/richman/check-release-assets.cjs /var/www/home-assistant/richman/generated`核对已部署素材。

## 校验范围

前端源码指纹覆盖Git已跟踪及未忽略的新前端文件、游戏资源清单和打包脚本。服务器可以在没有本地素材源和前端node_modules的情况下验证。清单可检测过期源码、缺失/篡改/额外产物和符号链接；它是发布一致性检查，不是独立密码签名或浏览器游戏验收。

资源清单仍为`scripts/richman/release-assets.json`的39个运行文件。二进制从本地安装资源导出，仅产物副本进入Git。Vite打包输出、字体、图片和音频都会增加仓库历史体积。

## 历史发布记录

本次流程检查：本地完整前端类型检查/Vite打包及61文件发布包、39素材校验通过；`npm run test:release`的隔离Git工作区检查覆盖无原始素材验证、源码过期、产物篡改/缺失/多余/符号链接拒绝，以及打包失败保留旧包；`bash -n deploy.sh`通过。以上是发布流程检查，不新增游戏长局验收。

首次S3发布的319项/44文件前端回归、前端lint/build和资源检查已通过；全量历史长局生成测试未完成，不计通过。首次服务器编译暴露离线验收脚本混入后端构建，已由`cafcb2c`排除`scripts/richman`修复。生产前端构建还受2GB内存、Node堆和会话交换限制影响；本流程将前端构建移至本地，后续不再依赖服务器临时交换空间。本文件不将历史游戏验收视为本次发布新增验收。
