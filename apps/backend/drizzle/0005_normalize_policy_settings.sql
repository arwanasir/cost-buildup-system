UPDATE "policy_settings" AS legacy
SET "key" = mapping.new_key
FROM (
  VALUES
    ('costVarianceThresholdPct', 'variance_threshold_pct'),
    ('fxToleranceThresholdPct', 'fx_tolerance_pct'),
    ('ciVarianceThresholdPct', 'ci_price_variance_pct'),
    ('poPrefix', 'po_number_prefix'),
    ('shipmentPrefix', 'shipment_number_prefix'),
    ('grnPrefix', 'grn_number_prefix'),
    ('lcPrefix', 'lc_number_prefix'),
    ('claimPrefix', 'claim_number_prefix'),
    ('defaultCurrency', 'default_currency')
) AS mapping(old_key, new_key)
WHERE legacy."key" = mapping.old_key
  AND NOT EXISTS (
    SELECT 1
    FROM "policy_settings" AS current
    WHERE current."key" = mapping.new_key
  );
--> statement-breakpoint

INSERT INTO "policy_settings" ("key", "value_numeric", "value_text", "description")
VALUES
  ('duty_payment_tolerance_pct', 1.0000, NULL, 'Allowed percentage variance between assessed and paid customs duty.'),
  ('po_approval_threshold_1', 10000.0000, NULL, 'Maximum PO value for the first approval tier, in ETB.'),
  ('po_approval_threshold_2', 50000.0000, NULL, 'Maximum PO value for the second approval tier, in ETB.'),
  ('lc_gm_threshold', 100000.0000, NULL, 'LC value above which General Manager approval is required, in ETB.')
ON CONFLICT ("key") DO NOTHING;
