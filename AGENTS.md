# HomeAssistant Agent Notes

This repository is being rebuilt from a clean slate. Keep the infrastructure
and release rules below available across future work.

## Retained Infrastructure

- Production server: `root@106.15.230.148`
- Public domains: `meiji3d.com`, `www.meiji3d.com`
- Production source checkout: `/var/HomeAssistant`
- Backend release root: `/var/lib/home-assistant`
- Backend current release: `/var/lib/home-assistant/current`
- Production backend environment: `/var/lib/home-assistant/shared/backend.env`
- Static site root: `/var/www/home-assistant`
- Nginx config: `/etc/nginx/conf.d/home-assistant.conf`
- Backend service name: `home-assistant-backend`
- Backend health endpoint: `http://127.0.0.1:3001/api/health`

## Database

- Database engine: MySQL 8
- Production host: `localhost` on the production server
- External host used for local development: `106.15.230.148`
- Port: `3306`
- Database: `homeAssistantDB`
- User: `homeAssistantUser`
- Local credentials are stored in the ignored root `.env`; never commit or
  print the password.
- Production credentials remain in
  `/var/lib/home-assistant/shared/backend.env`.
- This project always uses the cloud MySQL database. Do not add an in-memory
  database mode.
- Do not delete or reset production data unless the user explicitly requests
  that separate destructive operation.

## Git-to-Production Release Workflow

Always release in this order:

1. Run the appropriate local checks and inspect `git status --short`.
2. Stage only intended changes and create a normal, non-amended commit.
3. Push the commit to `origin main` and record the pushed commit hash.
4. On the server, inspect `/var/HomeAssistant` and require a clean working tree.
5. Run `git pull --ff-only origin main` inside `/var/HomeAssistant`.
6. Verify the server is on branch `main`, its `HEAD` equals the pushed commit,
   and its working tree is still clean.
7. Only after synchronization succeeds, deploy from the canonical source tree:

   ```bash
   cd /var/HomeAssistant
   SERVER_NAME=106.15.230.148 ./deploy.sh
   ```

8. Verify deployment success, PM2 status, the health endpoint, Nginx access,
   and the final server Git status.

Never deploy before Git synchronization is confirmed. Never ignore or
destructively clean a dirty server checkout without explicit user approval.
The new project must recreate a suitable `deploy.sh` before its first release.
