# Deployment Guide

Guild Management System — production deployment to **Vercel** (web), **Render** (API), **Neon** (PostgreSQL), **Upstash** (Redis).

## Quick checklist (Vercel + Render + Neon + Upstash)

| Bạn đã có | Còn cần |
|---|---|
| Neon PostgreSQL URL | Repo GitHub (public/private) |
| Upstash Redis URL | URL Render API sau deploy (vd. `https://guild-api.onrender.com`) |
| | URL Vercel sau deploy (vd. `https://xxx.vercel.app`) |
| | `JWT_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự) |

**Thứ tự deploy:** Render API → chạy migrate + seed → Vercel web → cập nhật `CORS_ORIGIN` trên Render → redeploy API.

### Render — Environment Variables (API)

| Key | Ghi chú |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Neon URL + `&schema=public` (bỏ `channel_binding=require` nếu lỗi kết nối) |
| `REDIS_URL` | Upstash: dùng **`rediss://`** (TLS), không dùng `redis://` |
| `JWT_SECRET` | Chuỗi bí mật dài, Render có thể auto-generate |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_DAYS` | `7` |
| `JWT_REFRESH_DAYS_REMEMBER` | `90` |
| `CORS_ORIGIN` | URL Vercel chính xác, vd. `https://your-app.vercel.app` |

Upstash ví dụ (thay password thật):

```
rediss://default:YOUR_PASSWORD@inspired-crow-87792.upstash.io:6379
```

Neon ví dụ (thay user/pass thật):

```
postgresql://USER:PASS@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&schema=public
```

### Vercel — Environment Variables (Web)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<render-service>.onrender.com/api` |

### Sau khi Render deploy lần đầu

Trên máy local (một lần):

```bash
export DATABASE_URL='postgresql://...neon...?sslmode=require&schema=public'
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
```

---

## 1. Neon PostgreSQL

1. Create a project at [neon.tech](https://neon.tech)
2. Create database `guild_management`
3. Copy the connection string (include `?sslmode=require`)

Example:

```
postgresql://user:password@ep-xxxx.region.aws.neon.tech/guild_management?sslmode=require
```

## 2. Upstash Redis

1. Create a database at [upstash.com](https://upstash.com)
2. Copy the Redis URL — use **`rediss://`** (TLS) in production, not `redis://`
3. Upstash CLI may show `redis-cli --tls -u redis://...`; convert to `rediss://` for the API

## 3. Backend on Render

### Option A — Blueprint (`render.yaml`)

1. Push this repository to GitHub
2. In Render Dashboard → **New** → **Blueprint**
3. Select the repo (uses root `render.yaml`)
4. Fill synced env vars:
   - `DATABASE_URL` — Neon connection string (external DB, not Render Postgres)
   - `REDIS_URL` — Upstash URL (`rediss://...`)
   - `CORS_ORIGIN` — your Vercel URL, e.g. `https://guild-web.vercel.app`
5. Blueprint no longer provisions Render Postgres — use Neon only

### Option B — Manual Web Service

- **Root Directory**: (repo root)
- **Build Command**:

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm --filter @guild/shared-types build && pnpm --filter @guild/shared-utils build && pnpm --filter @guild/api prisma:generate && pnpm --filter @guild/api build
```

- **Start Command**:

```bash
cd apps/api && pnpm exec prisma migrate deploy && node dist/main.js
```

- **Health Check Path**: `/api/health`

### Required env vars (API)

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash Redis URL |
| `JWT_SECRET` | Long random secret |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_DAYS` | `7` |
| `CORS_ORIGIN` | Vercel frontend origin |

### Post-deploy seed (one-time)

From a machine with network access to Neon:

```bash
export DATABASE_URL='postgresql://...neon.../guild_management?sslmode=require'
pnpm --filter @guild/api run prisma:seed
```

## 4. Frontend on Vercel

1. Import the GitHub repo in [vercel.com](https://vercel.com)
2. **Root Directory**: `apps/web`
3. **Framework**: Next.js
4. **Install Command**:

```bash
cd ../.. && corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile
```

5. **Build Command**:

```bash
cd ../.. && pnpm --filter @guild/shared-types build && pnpm --filter @guild/shared-utils build && pnpm --filter @guild/web build
```

6. Env:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service>.onrender.com/api` |

7. Deploy, then update Render `CORS_ORIGIN` to the Vercel URL and redeploy API if needed.

## 5. Docker (self-hosted)

```bash
export JWT_SECRET='your-long-secret'
export CORS_ORIGIN='https://your-domain.com'
export NEXT_PUBLIC_API_URL='https://api.your-domain.com/api'
docker compose up -d --build
```

Seed inside the API container (first time):

```bash
docker compose exec api pnpm run prisma:seed
```

## 6. Verify

1. `GET https://api.../api/health` → `{ status: "ok" }`
2. Open Swagger `https://api.../api/docs`
3. Login on Vercel with seeded admin
4. Create a member, import Excel template, create guild war day, spin giveaway

## 7. Security checklist

- Rotate `JWT_SECRET` after first deploy
- Restrict Neon / Upstash network if available
- Keep `CORS_ORIGIN` exact (no `*` in production)
- Soft-delete is used for users/members; purge jobs are out of scope
- Enable Render / Vercel HTTPS only (default)
