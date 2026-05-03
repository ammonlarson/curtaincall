# Curtain Call

A Broadway show tracker with an admin panel for managing show listings, built as a TypeScript monorepo deployed to AWS.

## Project Structure

```
apps/api/          Node.js API — Kysely + PostgreSQL, deployed as AWS Lambda
apps/web/          Next.js 15 admin panel — React 19, deployed via AWS Amplify
packages/shared/   Shared types, validators, and constants
ios/               Swift iOS app (Xcode via project.yml)
infrastructure/    Terraform — AWS (Lambda, RDS, S3, Amplify, VPC)
```

## Prerequisites

- Node.js >= 20
- PostgreSQL (local or remote)

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up the database. Create a PostgreSQL database named `curtaincall`, then run migrations:

```bash
# Defaults: host=localhost, port=5432, user=curtaincall, password=curtaincall
# Override with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME env vars
npm run migrate
```

The migration also creates a seed admin if `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set.

3. Optionally seed sample Broadway shows:

```bash
npm run seed
```

4. Start the dev servers:

```bash
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Next.js on http://localhost:3000
```

The web app proxies `/public/*`, `/admin/*`, and `/health` to the API via Next.js rewrites.

## Build

```bash
npm run build              # builds shared → api → web
npm run build:shared       # shared package only
npm run build:api          # API only (esbuild bundle)
npm run build:web          # Next.js only
```

## API

### Public Endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check with DB connectivity |
| GET | `/public/categories` | List show categories |
| GET | `/public/shows` | Paginated shows (query: `page`, `per_page`, `category`, `running`, `q`, `sort`, `order`) |
| GET | `/public/shows/search` | Search shows by title (query: `q`) |
| GET | `/public/shows/:id` | Single show detail |

### Admin Endpoints (session cookie required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/auth/login` | Login |
| GET | `/admin/auth/me` | Current admin info |
| POST | `/admin/auth/logout` | Logout |
| POST | `/admin/auth/change-password` | Change password |
| GET | `/admin/shows` | List shows (paginated) |
| POST | `/admin/shows` | Create show |
| POST | `/admin/shows/bulk` | Bulk create (max 50) |
| PATCH | `/admin/shows/:id` | Update show |
| DELETE | `/admin/shows/:id` | Delete show |
| POST | `/admin/shows/:id/image` | Get presigned S3 upload URL |
| GET | `/admin/admins` | List admins |
| POST | `/admin/admins` | Create admin |
| DELETE | `/admin/admins/:id` | Delete admin |
| GET | `/admin/audit-events` | Paginated audit log (filter: `entity_type`, `entity_id`, `actor_id`, `action`) |

All admin mutations are recorded in an immutable audit log with before/after snapshots.

## Database

Five tables: `shows`, `admins`, `admin_credentials`, `sessions`, `audit_events`.

Show categories: `musical`, `play`, `revival`, `special`.

Migrations are raw SQL executed via Kysely in `apps/api/src/db/migrate.ts`. The `audit_events` table has database-level triggers preventing updates and deletes.

## Deployment

The API runs as an AWS Lambda Function URL. Infrastructure is managed with Terraform in `infrastructure/`. Environments: `staging` and `prod`.

Key AWS services: Lambda (API), RDS PostgreSQL, S3 (show images), Amplify (web hosting), Secrets Manager (DB password).

The Lambda Function URL has its own CORS layer that only accepts complete origins (subdomain wildcards like `https://*.example.com` are rejected by AWS). To allow the Amplify-generated admin URL or any other host, add it to `extra_cors_origins` in the env's `terraform.tfvars` — see the example tfvars file for the expected format.

### Bastion AMI refresh

The bastion (`aws_instance.bastion` in `infrastructure/networking.tf`) is pinned to its launch-time AL2023 ARM64 AMI via `lifecycle.ignore_changes = [ami, ...]`, so routine `terraform plan` runs don't propose replacing it every time Amazon publishes a new AMI.

Because pinning hides patch drift, the bastion carries a `LastAmiRefresh = "YYYY-MM"` tag that records when it was last cycled. To refresh:

1. Edit `infrastructure/networking.tf` and bump the `LastAmiRefresh` tag value to the current `YYYY-MM`.
2. Apply with an explicit replace:

   ```bash
   terraform apply -replace=aws_instance.bastion
   ```

   This destroys and recreates the bastion on the latest AMI returned by the `aws_ami.amazon_linux` data source. Any in-flight EC2 Instance Connect sessions will be terminated.
3. Commit the tag bump.

Target cadence: refresh at least every 90 days, or sooner if AL2023 ships a CVE that affects the bastion.
