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
