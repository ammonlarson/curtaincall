# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build (builds shared → api → web)
npm run build

# Build individual packages
npm run build:shared
npm run build:api
npm run build:web

# Dev servers
npm run dev:api              # API on :3001 (tsx watch)
npm run dev:web              # Next.js on :3000

# Database
npm run migrate              # run Kysely migrations
npm run seed                 # seed database
```

## Architecture

TypeScript monorepo (npm workspaces):

- `apps/api/` — Node.js API (Kysely ORM + PostgreSQL, esbuild bundle, AWS SDK for S3/Secrets Manager)
- `apps/web/` — Next.js 15 admin panel (React 19, vanilla CSS)
- `packages/shared/` — shared types, validators, constants consumed by both api and web
- `ios/` — Swift iOS app (Xcode project via project.yml)
- `infrastructure/` — Terraform (AWS: Amplify, ECS, RDS, S3, IAM, VPC)

### API Runtime Model

The API has a dual runtime: it exports a `handler` for **AWS Lambda Function URLs** in production, and starts a **Node.js HTTP server** (or Bun) for local dev. Both paths share the same router instances — the only difference is how HTTP events are parsed and responses are serialized. See `apps/api/src/index.ts`.

### Custom Router

The API uses a hand-rolled `Router` class (`apps/api/src/router.ts`), not Express/Hono. It supports path parameters (`:id` style) and returns `Response` objects (Web API). Routes return `null` for no match, so the handler tries public routes first, then admin routes.

### Route Groups

- **Public** (`/public/*`, `/health`) — unauthenticated, read-only show data
- **Admin** (`/admin/*`) — session-authenticated, CRUD for shows + admin management + audit log

Admin routes use `requireAdmin` middleware (`apps/api/src/middleware/auth.ts`) which validates session cookies.

### Auth & Sessions

Session-based auth with HTTP-only cookies. Password hashing in `apps/api/src/auth/password.ts`, session lifecycle in `apps/api/src/auth/session.ts`. All admin mutations are recorded via `logAuditEvent` (`apps/api/src/audit.ts`).

### Database

Kysely with PostgreSQL. DB types in `apps/api/src/db/types.ts` use Kysely's `Generated`/`Selectable`/`Insertable`/`Updateable` pattern. Password resolves from `DB_PASSWORD` env var locally, or `DB_SECRET_ARN` (AWS Secrets Manager) in production.

### Web → API Proxy

The web app proxies API calls through Next.js rewrites (`apps/web/next.config.js`): `/public/*`, `/admin/*`, and `/health` forward to the API server. The web app itself is an admin dashboard — all components are admin-facing.

### Shared Package

`packages/shared` exports types (Show, Admin, AuditEvent, etc.), validation functions (`validateCreateShowInput`, etc.), and constants. Both api and web import from `@curtaincall/shared`.

## Key Decisions

- Kysely for type-safe SQL (no ORM magic) — migrations and seeds in `apps/api/src/db/`
- Custom router instead of a framework to keep the Lambda bundle minimal
- All admin actions audit-logged with before/after snapshots

## Workflow

- Run `npm run build` after making a series of code changes to verify everything compiles
- Prefer fixing the root cause over adding workarounds
- When unsure about approach, use plan mode (`Shift+Tab`) before coding

## Don'ts

- Don't modify generated files (`*.gen.ts`, `*.generated.*`)
- Don't modify `infrastructure/` without explicit confirmation
