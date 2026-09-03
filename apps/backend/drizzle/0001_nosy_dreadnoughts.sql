ALTER TABLE "cost_variances" ALTER COLUMN "variance_pct" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "cost_variances" ALTER COLUMN "variance_pct" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "duty_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "duty_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "vat_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "vat_rate" SET DEFAULT '15.0000';--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "excise_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "excise_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "withholding_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "customs_declaration_items" ALTER COLUMN "withholding_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "po_lines" ALTER COLUMN "estimated_duty_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "po_lines" ALTER COLUMN "estimated_duty_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "duty_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "duty_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "excise_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "excise_rate" SET DEFAULT '0.0000';--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "withholding_rate" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
ALTER TABLE "tariff_rates" ALTER COLUMN "withholding_rate" SET DEFAULT '3.0000';