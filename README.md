# Athletic Bharat

Production-quality MVP for a multi-tenant SaaS web app for Indian schools to manage yearly sports tournaments.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + React Hook Form + Zod
- **Backend:** Node.js API (Fastify + TypeScript)
- **DB:** PostgreSQL + Prisma
- **Auth:** NextAuth (Credentials) → JWT used to call Node API
- **Caching:** In-memory by default; Redis interface wired for optional use

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- **PostgreSQL** (see below: with or without Docker)

## Quick start (local dev)

### 1. Environment

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET and NEXTAUTH_SECRET (can use same value for dev).
```

### 2. Postgres: with or without Docker

**Option A – With Docker** (if Docker is installed):

```bash
docker compose up -d
```

Your `.env` can use:  
`DATABASE_URL=postgresql://athleticbharat:athleticbharat@localhost:5432/athleticbharat`

**Option B – Without Docker**

- **Local PostgreSQL:** Install [PostgreSQL](https://www.postgresql.org/download/windows/) on Windows. Create a database (e.g. `athleticbharat`) and a user with password, then set in `.env`:
  ```env
  DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/athleticbharat
  ```
- **Cloud Postgres (free tier):** Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app). Create a project, get the connection string, and set `DATABASE_URL` in `.env`.

Redis is optional for the MVP (in-memory cache is used if Redis is not configured).

### 3. Install dependencies and DB

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

**Windows: if `pnpm db:generate` fails with EPERM (operation not permitted)** — another process is locking the Prisma engine file. Try in order: (1) Close all dev servers, VS Code terminals running Node, and Prisma Studio. (2) In a **new** PowerShell run: `pnpm db:generate`. (3) If it still fails, remove the generated client and retry:  
`Remove-Item -Recurse -Force node_modules\.pnpm\@prisma+client*\\node_modules\.prisma -ErrorAction SilentlyContinue; pnpm db:generate`  
(4) As a last resort, run PowerShell as Administrator or temporarily exclude the project folder from antivirus real-time scan.

### 4. Run dev servers

```bash
# Terminal 1 – API (port 3001)
pnpm dev:api

# Terminal 2 – Web (port 3000)
pnpm dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:3001  

**Port 3000 already in use?** Run the web app on port 3002 instead: `pnpm dev:web:alt`, then open http://localhost:3002 (set `NEXTAUTH_URL=http://localhost:3002` in `.env` if you use that). To free port 3000 on Windows: `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`.

### 5. Public site and sign-in

- **Home:** http://localhost:3000 — marketing landing (features, pricing, blog, etc.).
- **Sign up:** http://localhost:3000/signup — create a school (tenant) + first admin; starts a **1‑month free trial** (up to 2 sports per competition). Then sign in and use the app.
- **Sign in:** http://localhost:3000/login  
  - **Platform admin:** `admin@platform.local` / `Admin@1234` → Manage tenants and sports library.  
  - **School admin (demo):** `admin@demoschool.local` / `School@1234` → Demo tenant; create competitions, categories, teams, brackets, results.

## Env vars

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for API JWT (must match what NextAuth uses to sign the token) |
| `NEXTAUTH_URL` | Next.js app URL (e.g. http://localhost:3000) |
| `NEXTAUTH_SECRET` | NextAuth secret |
| `NEXT_PUBLIC_API_URL` | API base URL (e.g. http://localhost:3001) |
| `APP_URL` | Public app URL (e.g. http://localhost:3000); used for Stripe redirects and sitemap |
| `STRIPE_SECRET_KEY` | Stripe secret key (for checkout, portal, webhooks) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional, for client-side) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (for `/api/billing/webhook`) |
| `STRIPE_PRICE_ID_PRO` | Stripe Price ID for Pro subscription (monthly) |
| `REDIS_URL` | Optional; if set, can switch cache to Redis |
| `PORT` | API port (default 3001) |

## Scripts

- `pnpm dev` – run API + web in parallel  
- `pnpm dev:web` – Next.js (port 3000)  
- `pnpm dev:web:alt` – Next.js on port 3002 (use when 3000 is busy)  
- `pnpm dev:api` – Fastify API (port 3001)  
- `pnpm db:generate` – Prisma generate  
- `pnpm db:migrate` – Prisma migrate dev  
- `pnpm db:seed` – Seed platform admin + sports library + demo tenant  
- `pnpm build` – build all apps  

## Seed data

- **Platform admin:** `admin@platform.local` / `Admin@1234`  
- **Demo school:** tenant "Demo School" (Mumbai, Maharashtra)  
- **School admin:** `admin@demoschool.local` / `School@1234`  
- **Global sports library:** Cricket, Football, Kabaddi, Basketball, Volleyball, Badminton, Chess, Athletics 100m, Long Jump, Shot Put (with rules and category templates).

## Project structure

```
apps/
  api/     – Fastify API (JWT auth, RBAC, tenant-scoped + platform routes)
  web/     – Next.js 14 App Router, NextAuth, shadcn-style UI
packages/
  db/      – Prisma schema, migrations, seed
```

## API design

- **Auth:** `POST /auth/login` (email/password) returns JWT. All other routes use `Authorization: Bearer <token>`.
- **Platform (PLATFORM_ADMIN):** `CRUD /platform/tenants`, `CRUD /platform/sports`.
- **Tenant-scoped:** All under `/tenants/:tenantId/...` (students, competitions, competition-sports, categories, teams, bracket, matches, scorecard, finalize, participants, results, leaderboard). See spec for full list.

## Multi-tenancy and RBAC

- Every tenant-owned record has `tenantId`; list/mutations are scoped by tenant.
- **Roles:** PLATFORM_ADMIN (global), SCHOOL_ADMIN, COORDINATOR, COACH, VIEWER.  
  Platform admin manages tenants and sports; school roles are scoped to their `tenantId`.

## Template + Engine + Renderer (multi-sport scorecards)

Scorecards are driven by **templates** (per sport in the global Sports Library), a **scoring engine** (server-side), and a **dynamic form renderer** (frontend).

### Enabling a sport and snapshotting templates

- When a school **enables a sport** for a competition (`POST /tenants/:tenantId/competitions/:competitionId/sports` with `sportId`), the API snapshots that sport’s `scorecardTemplateJson` into `CompetitionSport.templateSnapshotJson` and stores `templateVersion`.
- **Existing competitions are unaffected** by later template changes: they keep their snapshot.

### Creating a match and filling the scorecard

1. Create a category (e.g. from a template), add teams, generate bracket (for knockout).
2. Open the category page → each match has a **Scorecard** link.
3. **Scorecard** opens the template-driven form (if the competition sport has a template). Enter match-level scores and optional player stats → **Save draft** (stores DRAFT, returns computed preview) → **Finalize** (COORDINATOR or SCHOOL_ADMIN only) to lock the scorecard and set the match winner.

### Roles and finalize permissions

- **COACH / COORDINATOR:** Can save scorecard drafts.
- **COORDINATOR / SCHOOL_ADMIN:** Can finalize (lock scorecard, set winner, complete match).
- **VIEWER:** Read-only.

### API (template scorecard)

- `GET /tenants/:tenantId/matches/:matchId/template-scorecard` — Match info, template snapshot, existing MatchScorecard (if any), roster.
- `PUT /tenants/:tenantId/matches/:matchId/template-scorecard` — Save draft (payload + optional player lines); returns computed preview.
- `POST /tenants/:tenantId/matches/:matchId/template-scorecard/finalize` — Validate, compute, store FINAL, set match winner, audit log.

## Public website and self-serve

- **Routes (no auth):** `/` (landing), `/features`, `/pricing`, `/about`, `/contact`, `/blog`, `/blog/[slug]`, `/legal/privacy`, `/legal/terms`.
- **Signup:** `POST /auth/signup` (API) creates Tenant, User (SCHOOL_ADMIN), TenantSettings (sportsLimitTrial: 2), and TenantSubscription (TRIAL, 30 days). Then sign in at `/login` or get redirected after signup.
- **Billing:** Stripe Checkout (Pro) and Customer Portal. Next.js API routes: `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`. Webhook keeps `TenantSubscription` in sync (subscription created/updated/deleted, invoice paid/failed).

### Trial and plan gating

- **Trial:** Plan TRIAL, status TRIALING, `trialEndsAt` = signup + 30 days. Max sports per competition = `TenantSettings.sportsLimitTrial` (default 2).
- **Pro:** After successful Stripe subscription, plan = PRO, status = ACTIVE; unlimited sports per competition.
- **Enforcing limit:** API `POST .../competitions/:id/sports` returns `402` with code `PLAN_LIMIT_REACHED` when trial and enabled count ≥ limit. UI shows “Enabled X of Y” and disables “Enable” when at limit, with “Upgrade to Pro” CTA.
- **Billing page:** `/app/billing` — current plan, trial end date, “Upgrade to Pro” (Stripe Checkout), “Manage billing” (Stripe Portal for Pro).

### Stripe webhook (local dev)

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks to your app:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Set the printed webhook signing secret as `STRIPE_WEBHOOK_SECRET` in `.env`. Create a Pro price in Stripe Dashboard and set `STRIPE_PRICE_ID_PRO`.
