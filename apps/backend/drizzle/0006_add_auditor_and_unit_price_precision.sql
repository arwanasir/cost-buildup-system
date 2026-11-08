ALTER TYPE "public"."role_enum"
  ADD VALUE IF NOT EXISTS 'auditor' BEFORE 'system_admin';
--> statement-breakpoint

ALTER TABLE "po_lines"
  ALTER COLUMN "unit_price" TYPE numeric(18, 4)
  USING round("unit_price", 4);
--> statement-breakpoint

ALTER TABLE "shipment_items"
  ALTER COLUMN "ci_unit_price" TYPE numeric(18, 4)
  USING round("ci_unit_price", 4);
