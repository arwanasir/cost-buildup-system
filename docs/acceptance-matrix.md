# SRS Acceptance Matrix

This matrix maps the SRS acceptance criteria to the current implementation and the checks performed during the submission cleanup.

Status meanings:

- Verified: covered by code inspection plus passing automated build/test evidence.
- Partially verified: implementation exists and targeted checks pass, but a full browser UAT run should still be captured before submission.
- Manual evidence needed: save screenshots or exported files during the final demonstration pass.

| ID | Acceptance area | Current status | Evidence in project | Remaining submission action |
|----|-----------------|----------------|---------------------|-----------------------------|
| AC01 | Complete import cycle from supplier/PO through LC, shipment, customs, landed cost, GRN, ERP posting, reports, and audit | Partially verified | Backend modules exist for each step; frontend routes/pages are wired; backend build/typecheck/tests pass; runtime health is OK | Execute the full manual UAT checklist in `README.md` and save screenshots |
| AC02 | Allocation methods for value, weight, volume, quantity, and item-specific charges | Verified | `apps/backend/src/allocation`, `apps/backend/src/customs/allocation.service.ts`, allocation and landed-cost specs | Capture one UI calculation example in UAT evidence |
| AC03 | Customs duty and VAT calculation using HS/tariff data | Verified | `apps/backend/src/customs/duty-calculator.service.ts`, customs service specs, tariff master data | Capture one customs declaration and payment screen |
| AC04 | LC workflow and bank charge handling | Verified | `apps/backend/src/letters-of-credit`, LC charge sync/listener specs, LC alert scheduler specs, frontend LC form test | Capture LC creation and charge sync in manual UAT |
| AC05 | Landed cost formula and cost register integration | Verified | `apps/backend/src/cost-register`, `apps/backend/src/landed-cost`, landed cost specs | Capture final landed cost output with four-decimal amounts |
| AC06 | GRN cannot happen before customs clearance | Verified | `apps/backend/src/goods-receipts/goods-receipts.service.ts`, frontend GRN form status gating, GRN tests | During UAT, try GRN before clearance and show it is blocked |
| AC07 | Finalisation blocked while estimated costs remain unless allowed by role/process | Verified | `apps/backend/src/landed-cost/finalisation-guard.service.ts`, finalisation specs | Capture blocked finalisation and approved resolution |
| AC08 | Variance approval and maker-checker control | Verified | `apps/backend/src/variances`, `variances-auth.spec.ts`, auth/permissions guard fixes | Demonstrate one approval path with different users |
| AC09 | Four-decimal precision and decimal-safe money logic | Partially verified | Decimal.js usage, money utilities, backend calculation specs, frontend money inputs | Capture final report/cost screens showing four decimals |
| AC10 | RBAC route/API protection | Partially verified | Backend auth service/guards, seeded roles/permissions, frontend `PermissionGate` and auth store | Log in with at least admin, finance, customs, inventory, and auditor users |
| AC11 | Reports and exports | Partially verified | `apps/backend/src/reports`, reports specs, frontend reports pages | Open each required report, test filters, and capture/export evidence |
| AC12 | Audit ledger and lineage | Verified | `apps/backend/src/audit`, audit trigger spec, lineage service/spec | Capture audit/lineage screen during UAT |
| AC13 | Performance for large allocations/reporting | Verified by backend tests | `apps/backend/src/allocation/allocation.perf.spec.ts` and backend chunk tests | Optional: record test output as evidence |
| AC14 | Alerts and notifications | Verified | `apps/backend/src/letters-of-credit/lc-alert.scheduler.spec.ts`, notifications service specs, Mailpit runtime health | Open Mailpit at `http://localhost:8025` and capture alert email |

## Verification Completed

- Backend typecheck passed.
- Backend production build passed.
- Backend runtime health returned `status: ok` with database, MinIO, and SMTP dependencies up.
- Backend test chunks covering auth, notifications, variances, reports, customs, letters of credit, ERP sync, inventory posting, and goods receipts passed.
- Frontend production build passed.
- Focused frontend tests for goods receipts and letters of credit passed when run individually.

## Important Honesty Note

This project is close to submission-ready from a code/build/test perspective. For final academic submission, do one full browser walkthrough with seeded data and save screenshots or exported reports as evidence. That final UAT evidence is the main remaining non-code deliverable.
