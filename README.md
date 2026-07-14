# Guild Management System

Production-ready guild management platform for **Justice Online (Nghịch Thủy Hàn)**.

Monorepo with pnpm workspaces: Next.js admin UI, NestJS API, Prisma/PostgreSQL, Redis, JWT + RBAC.

## Project Structure

```
guild-management/
├── apps/
│   ├── api/          # NestJS REST API (Swagger, Prisma, JWT, Excel)
│   └── web/          # Next.js App Router dashboard
├── packages/
│   ├── shared-types/ # Enums, DTOs, Permission constants
│   └── shared-utils/ # Pagination, class parsing, helpers
├── docker-compose.yml
├── render.yaml       # Render backend deploy
└── apps/web/vercel.json
```

## Features

- Admin login with JWT + refresh tokens and RBAC (`member.*`, `guildwar.*`, `dungeon.*`, `report.*`, `user.*`, `audit.*`, `giveaway.*`)
- Member management with immutable history (names, classes, timeline)
- Excel import / export / template (members & guild war participants)
- Guild War days (Saturday), matches, MVP, attendance
- Giveaway spin wheel (winner decided by backend only)
- Dungeon schedules, register / cancel, class requirements
- Statistics dashboard, rankings, global search, audit log
- Dark / light mode, skeletons, toasts, error boundary

## Requirements

- Node.js 20+
- pnpm 9+
- Docker (for Postgres/Redis or full stack)

## Installation

```bash
corepack enable || true
npm install -g pnpm@9.15.9
pnpm install
pnpm --filter @guild/shared-types build
pnpm --filter @guild/shared-utils build
```

## Environment Variables

Copy `.env.example` into place:

```bash
cp .env.example apps/api/.env
# edit apps/api/.env

cp apps/web/.env.example apps/web/.env.local
# or set NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

| Variable | App | Description |
|---|---|---|
| `DATABASE_URL` | api | Neon / local PostgreSQL connection string |
| `REDIS_URL` | api | Upstash / local Redis URL |
| `JWT_SECRET` | api | Access token signing secret |
| `JWT_EXPIRES_IN` | api | Access token TTL (default `15m`) |
| `JWT_REFRESH_DAYS` | api | Refresh token lifetime in days |
| `CORS_ORIGIN` | api | Allowed frontend origin(s), comma-separated |
| `NEXT_PUBLIC_API_URL` | web | Public API base including `/api` |

## Database Migration & Seed

Start Postgres + Redis:

```bash
docker compose up -d postgres redis
```

Migrate and seed:

```bash
export DATABASE_URL='postgresql://guild:guild@127.0.0.1:5432/guild_management?schema=public'
pnpm db:generate
pnpm --filter @guild/api exec prisma migrate deploy
pnpm db:seed
```

Seeded accounts:

| Email | Password | Role |
|---|---|---|
| `admin@guild.local` | `Admin@123456` | Full permissions |
| `viewer@guild.local` | `Viewer@123456` | Read/write without user/audit delete |

## Run Local

```bash
# Terminal 1 – API (http://localhost:4000/api, Swagger /api/docs)
pnpm dev:api

# Terminal 2 – Web (http://localhost:3000)
pnpm dev:web
```

## Run Docker (full stack)

```bash
docker compose up -d --build
```

Services:

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Scripts

| Script | Description |
|---|---|
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | E2E tests (API + web) |
| `pnpm db:migrate` | Prisma migrate deploy |
| `pnpm db:seed` | Seed sample data |
| `pnpm docker:up` | `docker compose up -d` |

## Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel (frontend), Render (backend), Neon (Postgres), and Upstash (Redis).

Quick overview:

1. **Neon** — create PostgreSQL, copy connection string
2. **Upstash** — create Redis, copy URL
3. **Render** — use `render.yaml` or connect the repo; set `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `JWT_SECRET`
4. **Vercel** — import repo, root `apps/web`, set `NEXT_PUBLIC_API_URL` to your Render API URL + `/api`

## API Overview

Swagger: `/api/docs`

| Area | Prefix |
|---|---|
| Auth | `/api/auth` |
| Users | `/api/users` |
| Members | `/api/members` |
| Guild War | `/api/guild-war` |
| Giveaway | `/api/giveaway` |
| Dungeon | `/api/dungeon` |
| Reports | `/api/reports` |
| Search | `/api/search` |
| Audit | `/api/audit` |
| Health | `/api/health` |

## Game Classes

Tố Vấn · Thiết Y · Huyết Hà · Thần Tương · Cửu Linh · Toái Mộng · Long Ngâm

## License

Private / internal guild use.
