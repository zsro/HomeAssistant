# 已编译前端

`frontend/`与`frontend-manifest.json`由本地`npm run release:frontend`生成，一起提交Git。不要手工修改压缩代码或只更新清单。前端源码或打包脚本变更后重新生成，提交前运行`npm run release:verify`。

服务器`deploy.sh`只校验并复制此目录，不安装或编译前端。完整流程见[发布说明](../docs/richman/release-s3.md)与[项目流程](../AGENTS.md)。后端仍在服务器构建。
