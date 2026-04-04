# Project Instructions

## Commands

```bash
# Build (builds shared → api → web)
npm run build

# Build individual packages
npm run build:shared
npm run build:api
npm run build:web

# Dev servers
npm run dev:api              # API on :3001
npm run dev:web              # Next.js on :3000

# Database
npm run migrate              # run Kysely migrations
npm run seed                 # seed database
```

## Architecture

TypeScript monorepo (npm workspaces):

- `apps/api/` — Node.js API (Kysely ORM + PostgreSQL, esbuild bundle, AWS SDK for S3/Secrets Manager)
- `apps/web/` — Next.js 15 frontend (React 19, vanilla CSS)
- `packages/shared/` — shared types, validators, constants
- `ios/` — Swift iOS app (Xcode project via project.yml)
- `infrastructure/` — Terraform (AWS: Amplify, ECS, RDS, S3, IAM, VPC)

## Key Decisions

- API is proxied through Next.js rewrites in `apps/web/next.config.js` — the web app forwards `/public/*`, `/admin/*`, and `/health` to the API
- Kysely for type-safe SQL (no ORM magic) — migrations and seeds in `apps/api/src/db/`

## Workflow

- Run `npm run build` after making a series of code changes to verify everything compiles
- Prefer fixing the root cause over adding workarounds
- When unsure about approach, use plan mode (`Shift+Tab`) before coding

## Don'ts

- Don't modify generated files (`*.gen.ts`, `*.generated.*`)
- Don't modify `infrastructure/` without explicit confirmation
