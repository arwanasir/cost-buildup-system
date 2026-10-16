# Cost Buildup System Walkthrough

This document is a presentation-ready map of the project as inspected on 2026-10-11. It explains what the system is, how the folders relate, how the business flow moves through the backend and frontend, what to say in a presentation, what looks wrong, and how to run it from scratch.

## 1. What This Project Is

The Cost Buildup System is an ERP-style subsystem for imported goods. Its job is to track an imported item from procurement through arrival, customs clearance, cost buildup, landed cost calculation, warehouse receipt, ERP posting, variances, reports, and audit history.

In business terms:

1. Procurement creates a purchase order with estimated import costs.
2. A letter of credit can be opened and managed for the PO.
3. Shipments are created from approved POs.
4. Commercial invoice values and shipment-level costs are captured.
5. Customs duties, VAT, excise, withholding, clearing, freight, insurance, bank, port, and other costs are collected as cost entries.
6. Costs are allocated across shipment items.
7. Landed cost is computed per item and per unit.
8. Goods receipts use landed cost to value accepted warehouse quantities.
9. ERP sync posts inventory and finance records.
10. Variances, notifications, reports, and audit logs support control and traceability.

## 2. Technology Stack

Backend:

- NestJS with TypeScript.
- Drizzle ORM.
- PostgreSQL.
- JWT authentication with refresh tokens.
- MinIO/S3-style document storage.
- Mailpit/SMTP notifications.
- Swagger API docs.
- Jest test suite.

Frontend:

- React with Vite.
- TypeScript.
- React Router.
- TanStack Query.
- Zustand auth store.
- i18next translations.
- Recharts for reporting/visualization.
- Playwright and Vitest test scaffolding.

Infrastructure:

- Docker Compose for PostgreSQL, MinIO, Mailpit, ERP mock, backend, and frontend.
- `apps/docker/erp-mock` simulates an external ERP service.

## 3. Repository Layout

Top level:

- `README.md`: project overview, setup, verification commands, and manual acceptance checklist.
- `SRS_CostBuildup_ImportedItems.md`: canonical requirements/specification source for the domain.
- `docs/`: project walkthrough and SRS acceptance matrix.
- `apps/backend/package.json` and `apps/frontend/package.json`: app-specific dependencies and scripts.
- `apps/`: main application code.
- `docs/`: project documentation and acceptance matrix.
- One-off repair/generation scripts, API client exports, duplicate plain-text SRS extraction, local logs, and root dependency artifacts are excluded from the submission.
- `node_modules/` and `.pnpm-store/` are local dependency artifacts and must not be committed.

Main app folders:

- `apps/backend`: NestJS API and domain logic.
- `apps/frontend`: React UI.
- `apps/docker`: Docker Compose and ERP mock.

## 4. Backend Structure

Backend entry points:

- `apps/backend/src/main.ts`: creates the Nest app, sets `/api/v1` global prefix, enables CORS, installs global validation, and exposes Swagger at `/api/docs`.
- `apps/backend/src/app.module.ts`: root module. It wires every business module into the app and registers the global audit interceptor.
- `apps/backend/src/config`: environment mapping and Joi validation.
- `apps/backend/src/db`: Drizzle database provider, schema, relations, migrations, and seed data.

Backend shared/system modules:

- `auth`: login, refresh, logout, profile, password changes, JWT strategy, API key guard, permission guard, and permission constants.
- `users`: user administration, language preference, deactivate/reset password.
- `settings`: policy/settings table CRUD.
- `audit`: `@Audited` decorator, global interceptor, audit ledger service/controller.
- `notifications`: in-app/email/Telegram style notification orchestration.
- `storage`: MinIO/S3 upload, signed URLs, delete.
- `health`: health endpoint.
- `core/numbering`: generates document numbers such as PO/shipment.
- `common`: middleware and guards.

Backend business modules:

- `suppliers`: supplier master data and bank accounts.
- `items`: imported item master data, HS code defaults, typeahead search.
- `cost-categories`: cost category setup and default allocation methods.
- `exchange-rates`: NBE exchange rates.
- `tariffs`: HS code tariff rates, duty/VAT/excise/withholding structures.
- `purchase-orders`: PO header/lines, calculations, approval routing, status transitions.
- `letters-of-credit`: LC creation, GM approval, status changes, amendments, required documents, bank charges, LC alerts.
- `import-shipments`: shipment creation from POs, shipment documents, quantity checks, shipment charges, shipment cost entries, allocation, landed cost endpoints, finalisation endpoints.
- `commercial-invoices`: commercial invoice capture and price variance acknowledgement.
- `customs`: customs declaration, item duty assessment, rate override, duty payment, release.
- `cost-register`: manual/system import cost entries, mark actual, reverse, delete, attachment URL, summaries, FX tolerance.
- `allocation`: cost allocation by item, value, weight, volume, quantity, or equal basis.
- `landed-cost`: landed cost calculation and finalisation guard.
- `goods-receipts`: GRN creation/confirmation, receipt quantities, rejected goods claims, ERP posting trigger.
- `erp-sync`: finance/inventory posting clients, sync logs, retry.
- `variances`: variance evaluation, approve/reject.
- `lineage`: traceability from PO line through downstream objects.
- `reports`: landed cost, import cost, LC status, customs duty, shipment status, variance, supplier performance, Excel/PDF export.
- `integrations`: integration-facing endpoints.

## 5. Database Model

The schema is in `apps/backend/src/db/schema/schema.ts`, with enums in `enums.ts` and relations in `relations.ts`.

Main table groups:

- Access control: `roles`, `permissions`, `role_permissions`, `users`, `refresh_tokens`.
- Master data: `suppliers`, `suppliers_bank_accounts`, `items`, `cost_categories`, `tariff_rates`, `nbe_exchange_rates`, `policy_settings`.
- Procurement: `import_purchase_orders`, `po_lines`, `po_approvals`.
- LC: `letters_of_credit`, `lc_required_documents`, `lc_bank_charges`, `lc_amendments`.
- Shipment: `import_shipments`, `shipment_items`, `shipment_documents`, `commercial_invoices`.
- Customs: `customs_declarations`, `customs_declaration_items`, `duty_payments`.
- Costs: `import_cost_entries`, `cost_allocations`, `import_landed_cost_results`.
- Receiving: `goods_receipts`, `goods_receipt_items`, `rejected_goods_claims`.
- Control: `cost_variances`, `audit_ledger`, `notifications`, `erp_sync_log`, `journal_entries`.

The important relationship is:

```text
Supplier -> Purchase Order -> PO Lines
Purchase Order -> Letter of Credit
Purchase Order -> Import Shipment -> Shipment Items
Shipment -> Commercial Invoice
Shipment -> Customs Declaration -> Customs Declaration Items -> Duty Payments
Shipment -> Import Cost Entries -> Cost Allocations
Shipment Items + Allocations -> Landed Cost Results
Shipment -> Goods Receipt -> Goods Receipt Items -> ERP Sync / Claims
Everything important -> Audit Ledger / Notifications / Reports
```

## 6. Main Business Flow

High-level system flow:

```text
Master data setup
  suppliers, items, tariffs, FX rates, cost categories, settings
        |
        v
Purchase order
  draft -> pending approval -> approved
        |
        v
Letter of credit
  applied/opened/amended/charged/document tracked
        |
        v
Shipment
  shipment items copied from PO lines
  FOB actuals and PO estimates become cost entries
        |
        v
Commercial invoice and documents
  actual invoice values and variance acknowledgement
        |
        v
Customs
  declaration -> assessment -> duty/VAT cost entries -> payment -> release
        |
        v
Cost register
  freight, insurance, bank, port, clearing, storage, other costs
        |
        v
Allocation
  cost entries allocated across shipment items
        |
        v
Landed cost
  per item and per unit landed cost calculated/finalised
        |
        v
Goods receipt
  received/accepted/rejected quantities, claims, ERP inventory/finance posting
        |
        v
Reports, variances, audit, notifications
```

## 7. Backend Flow By Module

Purchase orders:

- Controller: `purchase-orders.controller.ts`.
- Service: `purchase-orders.service.ts`.
- Creates draft POs, validates active suppliers, resolves item HS codes, uses tariff rates for estimated duties, and delegates calculations to `PoCalculationService`.
- Submit moves the PO to `pending_approval`, creates `po_approvals`, and notifies users with the required approver role.
- Approve prevents self-approval and checks role level before marking `approved`.
- Reject requires a comment and returns the PO to draft.
- `PoStatusService` handles explicit transitions and close.

Letters of credit:

- Controller/service under `letters-of-credit`.
- Creates and tracks LCs linked to POs.
- Supports GM approval, status transitions, amendments, required documents, bank charges, and alert scheduling.
- Event listeners sync LC bank charges into shipment/cost workflows.

Shipments:

- Controller/service under `import-shipments`.
- A shipment can be created only from an approved or LC-applied PO.
- Shipment items come from PO lines.
- The service checks over-shipment rules and role authorization.
- Shipment creation inserts initial cost entries:
  - FOB actuals from commercial invoice item values.
  - freight/insurance/other estimates from the PO.
- It updates shipped quantities on PO lines and moves the PO to shipped.

Commercial invoices:

- Adds commercial invoice information to a shipment.
- Tracks price variance and acknowledgement.
- GRN creation blocks if unacknowledged price variances exceed configured policy.

Customs:

- Builds a declaration from shipment items and tariff rates.
- Computes CIF, duty, excise, VAT, and withholding.
- Supports manual rate override only with a reason.
- Assessing a declaration creates customs-sourced cost entries for duty/VAT/excise.
- Release updates both declaration status and shipment status.

Cost register:

- Stores all import cost entries for a shipment.
- Entries can be estimated or actual.
- Entries can be item-specific or allocated.
- Supports marking actual, reversing, deleting draft entries, retrieving attachments, and summarizing estimated vs actual cost.

Allocation:

- `AllocationService` allocates cost entries to shipment items.
- `AllocationBasisService` supplies basis values such as value, weight, volume, quantity, equal split, or item-specific assignment.
- Allocations feed landed cost calculation.

Landed cost:

- `computeDraft()` first allocates shipment costs, then calculates item landed costs.
- `finalise()` requires finance manager or general manager.
- Finalisation guard checks for blockers before finalising.
- Results are stored in `import_landed_cost_results`.
- The finalised event triggers downstream finance posting behavior.

Goods receipts:

- Creates GRNs only after customs release/clearance states.
- Validates accepted + rejected = received.
- Requires rejection reason if rejected quantity is greater than zero.
- Confirmation updates PO and shipment received statuses.
- Creates rejected goods claims when needed.
- Recomputes landed cost using accepted quantities.
- Posts to inventory and finance ERP services, without rolling back the GRN if ERP sync fails.

ERP sync:

- Builds inventory and finance payloads.
- Writes `erp_sync_log`.
- Supports retries from controller.
- `apps/docker/erp-mock` provides a local ERP API for development.

Reports:

- Reads aggregated data from shipment, landed cost, customs, LC, variance, and supplier performance tables.
- Can export to Excel and PDF.

Audit:

- The global `AuditInterceptor` records audited controller actions.
- `@Audited()` labels the entity type.
- Audit ledger is intended to be immutable.

Notifications:

- Used by approval workflows, LC alerts, GRN adjustment flags, and other operational events.

## 8. Frontend Structure

Frontend entry points:

- `apps/frontend/src/main.tsx`: mounts React.
- `apps/frontend/src/App.tsx`: wraps providers and router.
- `apps/frontend/src/app/router.tsx`: route table and permission-protected screens.
- `apps/frontend/src/lib/api-client.ts`: Axios instance, JWT attachment, token refresh, logout-on-401.
- `apps/frontend/src/store/auth.store.ts`: Zustand user/permission/access-token state.
- `apps/frontend/src/i18n`: English/Amharic translations.

Layout and shared UI:

- `components/layout`: sidebar and shell.
- `components/auth`: protected route and permission gate.
- `components/ui`: reusable controls such as Button, Table, Modal, Toast, DatePicker, FileDropzone, inputs, tabs, badges, skeletons, and amount display.

Feature folders:

- `features/auth`: login page.
- `features/dashboard`: dashboard KPI cards.
- `features/suppliers`: supplier list/detail/form.
- `features/items`: item list.
- `features/purchase-orders`: PO list/detail/wizard/API hooks.
- `features/letters-of-credit`: LC dashboard/create/detail/form/bank charges/doc checklist.
- `features/import-shipments`: shipment list/create/detail/document/commercial invoice components and API hooks.
- `features/customs`: customs list/create/detail/release/duty payment/rate override.
- `features/cost-register`: cost buildup page and cost entry/allocation components.
- `features/landed-cost`: landed cost dashboard, charts, result table, drilldown, finalisation panel.
- `features/goods-receipts`: GRN list/detail/form and claims.
- `features/variances`: variance queue.
- `features/reports`: reports page, filters, tables, tests.
- `features/settings`, `features/users`, `features/audit`, `features/notifications`, `features/tariffs`, `features/exchange-rates`, `features/cost-categories`: admin/supporting screens.

Frontend data pattern:

```text
Page component
  -> feature API hook
  -> shared Axios client
  -> backend /api/v1 endpoint
  -> TanStack Query cache invalidation after mutation
  -> UI refresh
```

Auth pattern:

```text
Login page -> /auth/login
  -> store user, permissions, access token
  -> save refresh token in sessionStorage
  -> ProtectedRoute checks auth and permission
  -> Axios adds Bearer token
  -> 401 triggers /auth/refresh
```

## 9. Important API Surface

Core endpoints all sit under `/api/v1`.

- `/auth`: login, refresh, logout, profile, password flows.
- `/users`: user admin.
- `/settings`: policy settings.
- `/suppliers`: suppliers and bank accounts.
- `/items`: item master and search.
- `/purchase-orders`: PO CRUD, lines, submit/approve/reject/transition/close/approvals.
- `/letters-of-credit`: LC CRUD/status/approval/documents/charges/amendments/alerts.
- `/import-shipments`: shipment CRUD, documents, status, items, charges, cost entries, allocation, landed cost, finalisation.
- `/customs`: customs declaration, assessment, payments, release, tariff lookup, item override.
- `/cost-entries`: entry-level cost actions.
- `/goods-receipts`: GRNs, confirm, post, retry, discrepancies, claims.
- `/variances`: queue, approve, reject, per-shipment evaluation.
- `/erp-sync`: logs and retry.
- `/reports`: report endpoints and export.
- `/audit`: audit logs.
- `/notifications`: user notifications.
- `/health`: health check.

## 10. Presentation Talking Points

Use this sequence:

1. "This is an import landed-cost subsystem."
2. "It starts with procurement master data: suppliers, items, tariffs, FX, and cost categories."
3. "A purchase order captures estimated import cost and goes through role-based approval."
4. "Shipments are created from approved POs and inherit item lines and estimates."
5. "Commercial invoices and customs declarations convert real import charges into cost entries."
6. "The allocation engine distributes shared costs to each shipment item."
7. "The landed cost engine calculates final per-item and per-unit ETB cost."
8. "Goods receipt uses those costs for warehouse valuation and ERP posting."
9. "Audit logs, notifications, reports, and variances provide control and traceability."
10. "The code mirrors the business process: each folder is a module for one business capability."

## 11. Verification Results

Commands run:

- `pnpm run typecheck` in `apps/backend`: passed.
- `pnpm run build` in `apps/backend`: passed.
- `pnpm run test --runInBand` in `apps/backend`: failed before executing most tests because Jest cannot load ESM packages from Nest dependencies in the current CommonJS test setup.
- `pnpm run typecheck` and `pnpm run test` in `apps/frontend`: blocked because dependencies attempted to download from npm and network access was denied in the sandbox.

Backend test failure pattern:

```text
Must use import to load ES Module:
@nestjs/config/dist/index.js
@nestjs/event-emitter/dist/index.js
```

This is not a business-logic assertion failure. It is a Jest/ESM configuration issue.

## 12. Issues And Fixes Needed

High priority:

1. Backend Jest config needs ESM/package transform support.
   - Typecheck and build pass, but tests are currently not usable.
   - The existing `transformIgnorePatterns` does not handle pnpm's nested `.pnpm` path layout well enough for ESM Nest packages.
   - Fix options:
     - Adjust Jest/ts-jest for ESM.
     - Add pnpm-aware `transformIgnorePatterns`.
     - Use a Node/Jest combination that supports `require(esm)` cleanly.

2. Frontend dependencies are not locally complete in `apps/frontend`.
   - Frontend verification could not run because `pnpm` tried to fetch packages and network was blocked.
   - Run `pnpm install` with network access inside `apps/frontend`, then rerun typecheck/test/build.

3. `/shipments` route is still a placeholder.
   - `apps/frontend/src/app/router.tsx` maps `/shipments` to `Placeholder`.
   - Real shipment pages exist in `features/import-shipments`, so the route should be wired to `ShipmentsListPage`, with create/detail routes added if required.

4. `useOutstandingPurchaseOrders()` calls `/purchase-orders/outstanding`, but the backend has no such route.
   - Backend controller exposes `/purchase-orders`, `/:id`, `/:id/approvals`, etc.
   - Fix by adding a backend route before `@Get(':id')`, or remove/change the frontend hook.

5. Backend Dockerfile has suspicious/inconsistent package manager usage.
   - Backend package has both npm and pnpm artifacts.
   - Dockerfile uses npm, then runs `npm install --frozen-lockfile`, which is a pnpm/yarn-style flag and should be cleaned up.
   - `ENV NPM_HOME = "/npm"` should be normalized to Docker's standard `ENV NPM_HOME=/npm`.

Medium priority:

6. Root README cleanup.
   - The README has been replaced with project architecture, setup, verification, and UAT guidance.

7. Repository hygiene cleanup.
   - Root dependency artifacts, one-off scripts, API client exports, and duplicate SRS text extraction are removed from version control; ignore rules keep local copies out of future commits.
   - App-specific lockfiles and required project documentation remain tracked.

8. Permission mismatch risk.
   - Sidebar guards customs link with `customs:read`, while router protects customs pages with `shipment:read`.
   - Align frontend route permissions with backend permission intent.

9. Dashboard endpoint mismatches.
   - Dashboard calls `/cost-register?status=draft`, but backend cost endpoints are mostly shipment-scoped `/import-shipments/:id/cost-*` and entry-scoped `/cost-entries`.
   - Dashboard safely catches this and returns zero, but the KPI is not real yet.

10. Status naming looks inconsistent.
   - Frontend dashboard queries shipments at `customs_clearance`.
   - Backend shipment status enum/services use statuses like `ordered`, `cleared`, `partially_received`, `received`, and service checks include `customs_released`.
   - Align status names before demoing KPIs.

## 13. Run From Scratch

Prerequisites:

- Docker Desktop.
- Node.js 20+.
- pnpm enabled through Corepack.
- npm if using the backend Dockerfile as currently written.

Recommended environment file:

Create `apps/.env` because `apps/docker/docker-compose.yml` references `../.env` from `apps/docker`.

Example:

```env
POSTGRES_DB=cost_buildup_db
POSTGRES_USER=cost_buildup_user
POSTGRES_PASSWORD=password

JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin_password
MINIO_BUCKET=costbuildup-documents

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@costbuildup.local

ERP_BASE_URL=http://erp-mock:3001
ERP_API_KEY=mock_erp_key

FRONTEND_URL=http://localhost:5173
FAIL_MODE=false
```

Start dependencies and apps with Docker:

```bash
cd apps
docker compose -f docker/docker-compose.yml up -d postgres minio mailpit erp-mock
docker compose -f docker/docker-compose.yml up backend frontend
```

Backend URL:

```text
http://localhost:3000/api/v1
```

Swagger docs:

```text
http://localhost:3000/api/docs
```

Frontend URL:

```text
http://localhost:5173
```

MinIO console:

```text
http://localhost:9001
```

Mailpit:

```text
http://localhost:8025
```

Run backend locally without Docker app container:

```bash
cd apps/backend
pnpm install
pnpm run db:migrate
pnpm run db:seed
pnpm run start:dev
```

Run frontend locally:

```bash
cd apps/frontend
pnpm install
pnpm run dev
```

Useful verification commands:

```bash
cd apps/backend
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run test:e2e
```

```bash
cd apps/frontend
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run e2e
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

## 14. Demo Flow For Presentation

Best demo path:

1. Login as an admin or seeded demo user.
2. Show master data: suppliers, items, tariffs, exchange rates, cost categories.
3. Create or open a PO.
4. Explain PO estimated costs and approval.
5. Open LC screen and show document/charge tracking.
6. Create/open a shipment from the PO.
7. Show shipment documents and commercial invoice.
8. Open customs declaration, assessment, duty payment, release.
9. Show cost buildup and allocation.
10. Show landed cost results and item drilldown.
11. Create/confirm GRN.
12. Show ERP sync logs, variances, reports, audit logs, and notifications.

## 15. One-Slide Architecture Summary

```text
React Frontend
  pages + feature API hooks + auth store
        |
        v
NestJS API
  controllers -> services -> Drizzle ORM
        |
        v
PostgreSQL
  operational data, audit ledger, reports

Supporting services:
  MinIO for documents
  Mailpit/SMTP for email
  ERP mock for inventory/finance posting
```

## 16. What To Say If Asked "Is It Complete?"

Good answer:

"The backend domain model is broad and the core flow is implemented across PO, LC, shipment, customs, cost register, landed cost, GRN, ERP sync, reports, audit, and notifications. The frontend has most feature areas scaffolded and many pages/components built. The main completion risks are integration polish: tests need Jest ESM configuration, some frontend routes and endpoint hooks need alignment with the backend, and repo hygiene should be cleaned before handoff."
