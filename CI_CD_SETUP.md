# Backend CI/CD Setup (VPS)

This project now has a GitHub Actions workflow at:
- `.github/workflows/deploy-backend.yml`

It deploys automatically on every push to `main` (and can be run manually).

## 1. Required GitHub Secrets

Add these in GitHub repo settings:
- `VPS_HOST`: VPS IP or domain (example: `srv1287019` IP)
- `VPS_USER`: SSH user (example: `root`)
- `VPS_SSH_KEY`: Private SSH key content used by GitHub Actions
- `VPS_PORT`: SSH port (usually `22`)
- `VPS_APP_DIR`: Full backend path on VPS (example: `/root/FullBackend`)
- `APP_RESTART_COMMAND` (optional but recommended):
  - PM2 example: `pm2 restart fullbackend || pm2 start index.js --name fullbackend && pm2 save`
  - systemd example: `systemctl restart fullbackend`

## 2. One-Time VPS Preparation

Run once on VPS inside backend directory:

```bash
cd /root/FullBackend
git branch
```

Make sure the deployment branch exists on VPS (default: `main`) and repository remote is configured correctly.

If you use PM2, set app once:

```bash
pm2 start index.js --name fullbackend
pm2 save
```

## 3. Deployment Flow

On push to `main`, workflow will:
1. SSH to VPS
2. `cd` into `VPS_APP_DIR`
3. `git fetch`, `checkout`, `pull`
4. `npm ci --omit=dev`
5. Restart app via `APP_RESTART_COMMAND` (or PM2 fallback)

## 4. Notes

- Production env values stay on VPS in `/root/FullBackend/.env`.
- `node_modules` on VPS will be rebuilt from lock file.
- A new script was added in `package.json`:
  - `start:prod`: `node index.js`
