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

For browser end-to-end tests, first start the required application services, then run `pnpm run e2e`. The Playwright global setup may reset and seed its configured database. Use a disposable test database; never point destructive test setup at data you need to keep.
