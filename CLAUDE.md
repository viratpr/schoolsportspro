# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Athletic Bharat** is a multi-tenant SaaS platform for managing school sports tournaments in India. It uses a pnpm monorepo with three packages: a Fastify API, a Next.js 14 frontend, and a shared Prisma database package.

## Commands

```bash
# Development
pnpm dev              # Run API (port 3001) + web (port 3000) in parallel
pnpm dev:api          # Fastify API only
pnpm dev:web          # Next.js only (port 3000)
pnpm dev:web:alt      # Next.js on port 3002 (used for E2E tests)
pnpm free:api-port    # Kill whatever is running on port 3001

# Database
pnpm db:generate      # Regenerate Prisma client after schema changes
pnpm db:migrate       # Run migrations (dev)
pnpm db:seed          # Seed with demo data (school, users, competition)

# Build & Lint
pnpm build
pnpm lint

# E2E Tests (Playwright, Chromium only)
pnpm test:e2e         # Headless
pnpm test:e2e:ui      # With Playwright UI
```

Docker (PostgreSQL 16 on port 5433, Redis 7 on port 6379):
```bash
docker compose up -d
```

Environment variables needed: `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL`, `APP_URL`. Stripe and Redis vars are optional.

**Vercel (single project):** set the Vercel project **Root Directory** to `apps/web`. Install/build use [apps/web/vercel.json](apps/web/vercel.json) (repo-root `pnpm install` + `pnpm --filter @bharatathlete/web run build`). Copy every secret that the API needed (`DATABASE_URL`, `JWT_SECRET`, Stripe keys, etc.) into this project. The Fastify app is served under **`/api/rest`** via `pages/api/rest/[[...slug]]`. Optional: set `NEXT_PUBLIC_API_URL` to `https://<your-domain>/api/rest` for an explicit public API base.

**Legacy Vercel API-only project** (`apps/api`): after `pnpm --filter @bharatathlete/api run build`, use serverless entry **`dist/vercel-entry.js`** (default export), not `dist/index.js`.

## Architecture

### Monorepo Layout

- `apps/api/` — Fastify 5 REST API (TypeScript, Node 18+)
- `apps/web/` — Next.js 14 App Router frontend (TypeScript, TailwindCSS, shadcn/ui)
- `packages/db/` — Prisma schema, migrations, seeds; re-exports `PrismaClient`
- `tests/` — Playwright E2E tests
- `docs/` — Mermaid architecture diagrams

### Authentication Flow

1. User submits email/password on the login page → NextAuth `authorize` runs [`loginWithEmailPassword`](apps/web/src/lib/auth-login.ts).
2. **Primary:** `POST /auth/login` — Prisma `User` + bcrypt `passwordHash` (omit or null `passwordHash` for Supabase-only profiles).
3. **Fallback (if Supabase env is set):** `signInWithPassword` via `@supabase/supabase-js`, then `POST /auth/supabase-bridge` with the access token; API checks the token and loads the same Prisma `User` by email, then mints the app JWT.
4. NextAuth stores that JWT in the session; the web client sends `Authorization: Bearer` to the API.

Supabase env (web + API): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. See [`.env.example`](.env.example).

### API Design

Routes are split into two zones:
- **Platform routes** (`/platform/*`) — PLATFORM_ADMIN only; manage global tenants and the sports library
- **Tenant routes** (`/tenants/:tenantId/*`) — scoped to a school; competitions, students, matches, scorecards, categories, teams, brackets

Key service modules in `apps/api/src/`:
- `lib/score-engine/` — computes scores for all ScoringModel types
- `lib/templates/` — sport-specific scorecard templates
- `services/bracket.ts` — knockout bracket generation
- `services/cricket.ts` — cricket innings/scoring logic
- `services/scorecard.ts` — template-driven scorecard orchestration

### Multi-tenancy & RBAC

Every DB record has `tenantId`. Roles in descending privilege: `PLATFORM_ADMIN → SCHOOL_ADMIN → COORDINATOR → COACH → VIEWER`. Role checks are enforced in route handlers after JWT verification.

### Scoring System

Sports define a `ScoringModel` enum value: `SIMPLE_POINTS`, `SETS`, `CRICKET_LITE`, `TIME_DISTANCE`, or `ATTEMPTS_BEST_OF`. Each `CompetitionSport` snapshots the sport's template at creation time. The frontend uses a dynamic form renderer; the API uses the score engine to compute results from submitted scorecards.

### Subscription / Billing

Tenants start on a `TRIAL` plan (2 sports per competition). Upgrading to `PRO` removes limits. Stripe webhooks update `TenantSubscription`. Subscription gating is enforced server-side in the API routes.

### Database

Schema lives in `packages/db/prisma/schema.prisma`. After editing the schema, always run `pnpm db:generate` (and `pnpm db:migrate` if you want a migration). The seed script at `packages/db/prisma/seed.ts` creates a demo school, admin user, and sample competition — credentials are documented in `tests/README.md`.
