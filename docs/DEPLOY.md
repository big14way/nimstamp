# Deploying NimStamp

Two Cloudflare resources: a Pages project (web) and a Worker + D1 database (api). Free tier is enough.

## 0. Prerequisites
- Cloudflare account, `wrangler` logged in (`npx wrangler login`), pnpm 10, Node 22+.
- Two hostnames, e.g. `nimstamp.example` (web) and `api.nimstamp.example` (api).

## 1. API (Worker + D1)
```bash
cd packages/api
npx wrangler d1 create nimstamp                  # copy the database_id into wrangler.toml
npx wrangler d1 execute DB --remote --file=src/db/schema.sql
npx wrangler secret put SESSION_SECRET           # e.g. `openssl rand -hex 32`
# optional: NIMIQ_RPC_AUTH, PRICE_API_KEY
```
Edit `[vars]` in `wrangler.toml`: `ALLOWED_ORIGINS=https://nimstamp.example`, `APP_URL=https://nimstamp.example`, keep `DEMO_MODE="0"`.
Then:
```bash
npx wrangler deploy
curl https://api.nimstamp.example/health          # expect {"ok":true,"rpc":"ok",...}
```
The cron trigger (`* * * * *`) is created by the deploy. Add the custom domain under Workers → Settings → Domains & Routes.

## 2. Web (Pages)
Create a Pages project from the GitHub repo (production branch `main`):
- Build command: `pnpm install --frozen-lockfile && pnpm --filter @nimstamp/web build`
- Build output directory: `packages/web/dist`
- Environment variables: `VITE_API_BASE=https://api.nimstamp.example`, `VITE_WALLET=nimiqpay`, `VITE_APP_URL=https://nimstamp.example`, `VITE_EXPLORER_TX_URL=https://nimiq.watch/#`
- Node version: 22

Or from the CLI: `pnpm --filter @nimstamp/web build && npx wrangler pages deploy packages/web/dist --project-name nimstamp`.

`public/_redirects` handles SPA routing, `public/_headers` sets HSTS and nosniff.

## 3. Preview / demo deployments
For a preview Worker set `DEMO_MODE=1` (accepts the web mock wallet's signatures and enables `POST /demo/pay`). Never on production.

## 4. Local development
```bash
pnpm install
cp packages/api/.dev.vars.example packages/api/.dev.vars
cd packages/api && pnpm db:migrate:local && pnpm dev          # http://localhost:8787
cd packages/web && cp .env.example .env && pnpm dev            # http://localhost:5173 (VITE_WALLET=mock)
```
With the mock wallet, `?mockAddress=NQ…` switches the simulated user and `?mockCancel=1` simulates a cancelled wallet dialog.
To test on a phone inside Nimiq Pay, expose the dev server on your LAN IP (Vite prints it) and open `https://nimpay.app/miniapps/open/<lan-ip>:5173`.
