# HomeAssistant Agent Notes

## Deployment

- Production server git project path: `/var/HomeAssistant`
- Production backend release root: `/var/lib/home-assistant`
- Production backend current release: `/var/lib/home-assistant/current`
- Production backend env file: `/var/lib/home-assistant/shared/backend.env`
- Static site path: `/var/www/home-assistant`
- Nginx config path: `/etc/nginx/conf.d/home-assistant.conf`
- Deploy command on server: `cd /var/HomeAssistant && SERVER_NAME=106.15.230.148 ./deploy.sh`

## Conventions

- This project always uses the cloud MySQL database. Do not reintroduce in-memory database mode.

## API Docs

- Apifox 云端接口文档同步说明见 `docs/apifox-sync.md`。
- 更新后端 HTTP 接口后，先执行 `npm run openapi:write`，再按文档执行 `npm run apifox:sync`。
- 本仓库以 `scripts/sync-apifox.js` 生成的 `docs/openapi.json` 为接口文档事实来源，不要只在 Apifox 网页里手工改文档。
