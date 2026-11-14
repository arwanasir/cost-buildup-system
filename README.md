# Cost Buildup for Imported Items

An ERP-style application for managing imported goods from supplier and item setup through purchase orders, approvals, shipments, customs, landed cost, goods receipts, ERP posting, reports, and audit history.

## Project Structure

- `apps/backend`: NestJS REST API, PostgreSQL persistence through Drizzle, authentication and permissions, business workflows, document storage, notifications, and ERP mock integration.
- `apps/frontend`: React, TypeScript, and Vite web application.
- `apps/docker`: Docker Compose configuration and the ERP mock service.
- `SRS_CostBuildup_ImportedItems.md`: canonical requirements reference. API inspection is available through Swagger at `/api/docs` when the backend is running.

Backend modules are organized by business domain under `apps/backend/src` (including auth/users, master data, purchase orders, letters of credit, shipments, customs, cost register/allocation/landed cost, goods receipts, ERP sync, reports, audit, notifications, storage, and database schema/migrations). Frontend code under `apps/frontend/src/features` follows the same domain areas; shared routing, layout, UI, API client, state, and tests live in `app`, `components`, `lib`, `store`, and `test`.

## Main Business Flow

1. Configure suppliers, items, tariffs, exchange rates, cost categories, users, roles, and settings.
2. Create and approve a purchase order.
3. Open a letter of credit when required and capture bank charges.
4. Create a shipment from outstanding purchase order lines; attach shipping documents and commercial invoices.
5. Prepare a customs declaration, calculate duty and VAT, record payment, and clear the shipment.
6. Enter and allocate shipment costs, calculate per-item landed cost, and complete finalisation checks.
7. Create a goods receipt after clearance, record discrepancies, and process claims/variances.
8. Post inventory and finance entries to the ERP mock; review reports, notifications, lineage, and audit history.

If a GRN is posted before landed-cost finalisation, inventory receives the
estimated unit cost first and the GRN is flagged for adjustment. After a Finance
Manager approves the adjustment journal, the final per-unit costs are sent to
the ERP inventory mock. Both ERP calls use stable identifiers so retries do not
create duplicate receipts, journal entries, or cost adjustments.

**LC bank-charge allocation choice:** a charge is divided equally among the
shipments linked to its LC when it is synchronized. If the charge is recorded
before any shipment exists, the first subsequently created shipment receives
the full charge. Existing allocations are not rebalanced when later shipments
are created. The landed-cost allocator then allocates each shipment's bank
charge to its items by item value.

## Requirements

- Node.js 20 or newer.
- npm (backend dependencies are locked in `apps/backend/package-lock.json`).
- pnpm 10 or newer for the frontend (`corepack enable` can enable Corepack-managed pnpm).
- Docker Desktop with Docker Compose.

## Run From Scratch (Windows PowerShell)

Run from the repository root unless a step changes directory. Create local environment files from the examples; do not commit the resulting `.env` files:

```powershell
Copy-Item apps\.env.example apps\.env
Copy-Item apps\frontend\.env.example apps\frontend\.env
```

Start PostgreSQL, MinIO, Mailpit, and the ERP mock:

```powershell
docker compose --env-file apps\.env -f apps\docker\docker-compose.yml up -d postgres minio mailpit erp-mock
```

In terminal 1, install the backend dependencies, migrate and seed the database, then start the API:

```powershell
cd apps\backend
npm ci
npm run db:migrate
npm run db:seed:demo
npm run start:dev
```

Apply the committed migrations with `npm run db:migrate`. Do not run
`npm run db:generate` (or `drizzle-kit generate`) blindly: the migration journal
contains migrations `0000` through `0014`, but Drizzle currently has only the
`0000` snapshot. Generating a migration from that incomplete snapshot history
can propose changes that are already present in later committed migrations.
Review and reconcile the migration snapshots before generating new migrations.
The `db:reset` command is destructive to its configured database; it now
reapplies committed migrations and does not generate a new migration.

The API base URL is `http://localhost:3000/api/v1`; health is at `http://localhost:3000/api/v1/health`, and Swagger is at `http://localhost:3000/api/docs`.

In terminal 2, install and start the frontend:

```powershell
cd apps\frontend
pnpm install --frozen-lockfile
pnpm run dev
```

Open `http://localhost:5173`. The frontend API URL is configured by `VITE_API_URL` in `apps/frontend/.env`.

### Demo Login

The demo seed provides `admin@company.com` with password `Password123!`. Other seeded demo accounts use the same password, including `importer@company.com`, `finance.officer@company.com`, `finance.mgr@company.com`, `inventory.mgr@company.com`, `customs@company.com`, `auditor@company.com`, and `executive@company.com`. These are local demo credentials only; change or remove them for any deployed environment.

### Optional Full Docker Run

After creating `apps\.env`, build and start the complete stack:

```powershell
docker compose --env-file apps\.env -f apps\docker\docker-compose.yml up --build
```

In another terminal, initialize the database inside the running backend container:

```powershell
docker exec cost_buildup_backend npm run db:migrate
docker exec cost_buildup_backend npm run db:seed:demo
```

## Verify and Test

Backend, from `apps\backend`:

```powershell
npm run typecheck
npm run build
npm test -- --runInBand
```

Frontend, from `apps\frontend`:

```powershell
pnpm run typecheck
pnpm run build
pnpm test
```

### Backend End-to-End Tests

The backend e2e setup drops and recreates its target database before running,
then removes it during teardown. Use a PostgreSQL user with permission to create
and drop databases. Never use your development, submission, or production
database. From `apps\backend`, set the URL to a disposable database whose name
starts with `costbuildup_e2e_`, then run the suite:

```powershell
$env:E2E_DATABASE_URL = "postgresql://cost_buildup_user:password@localhost:5432/costbuildup_e2e_local"
$env:E2E_ALLOW_DATABASE_RESET = "true"
npm run test:e2e
```

Both environment variables are required. The database name prefix is checked
before reset. The suite migrates and seeds the database itself. ERP requests in
the GRN e2e test are intercepted using `ERP_BASE_URL` (default:
`http://localhost:3001`), matching the example environment configuration.
The audit-ledger integration test inserts a disposable audit row and verifies
that UPDATE, DELETE, and TRUNCATE are rejected by PostgreSQL.

### Browser End-to-End Tests

The Playwright setup seeds demo data but does not reset the database. Prepare a
disposable database first. From `apps\backend`, set the test database variables,
prepare the database, and start the API against that same URL:

```powershell
$env:E2E_DATABASE_URL = "postgresql://cost_buildup_user:password@localhost:5432/costbuildup_e2e_local"
$env:E2E_ALLOW_DATABASE_RESET = "true"
$env:DATABASE_URL = $env:E2E_DATABASE_URL
$env:SEED_DATABASE_URL = $env:E2E_DATABASE_URL
npx ts-node test/prepare-e2e-database.ts
npm run db:seed:demo
npm run start:dev
```

In another terminal, from `apps\frontend`, set the two `E2E_` variables to the
same values and run `pnpm run e2e`. The Playwright setup checks the explicit
reset confirmation and the `costbuildup_e2e_` database-name prefix, then seeds
demo records using `E2E_DATABASE_URL`. To start with a clean database on a later
run, stop the API and rerun `npx ts-node test/prepare-e2e-database.ts` from the
backend terminal. It recreates only the guarded e2e database.

## Deployment and Operations

Deploy the frontend and API as separate services, with PostgreSQL and MinIO
provided by persistent managed services or protected persistent volumes. Set
production values for database and JWT credentials, ERP credentials, MinIO,
SMTP, CORS/frontend URL, and the public API URL through the host's secret and
environment configuration. Never deploy the example credentials or demo seed
users. Restrict PostgreSQL and MinIO to the application network, and terminate
browser/API traffic with HTTPS at the hosting provider or reverse proxy.
Run the API with `NODE_ENV=production`: database connections and production
SMTP delivery require certificate-validated TLS 1.3. Set `SMTP_SECURE=true` for
implicit TLS (usually port 465); otherwise production SMTP uses required
STARTTLS. The development Mailpit connection remains plain SMTP.

For each release, back up PostgreSQL and document storage, deploy the API, run
`npm run db:migrate` once against the production database, seed only required
reference data when needed, and then deploy the frontend. Do not run
`db:reset`, `db:push`, or unreviewed migration generation against production.
After deployment, verify API health, login, a read-only report, document upload
and view, and ERP connector health. Monitor API logs, database capacity,
document storage, notification delivery, and ERP posting failures. Test backup
restoration and retain a rollback build before accepting production traffic.

The local ERP mock provides `GET http://localhost:3001/health`. Approved final
inventory adjustments are available at
`GET http://localhost:3001/inventory/adjustments/{journal-id}` for local
verification; this in-memory mock state is cleared when its container restarts.
