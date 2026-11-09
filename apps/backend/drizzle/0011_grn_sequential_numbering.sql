CREATE SEQUENCE IF NOT EXISTS public.grn_number_seq START 1;
--> statement-breakpoint

SELECT setval(
  'public.grn_number_seq',
  COALESCE(
    (
      SELECT MAX((substring(grn_number FROM '^GRN-([0-9]+)$'))::bigint) + 1
      FROM public.goods_receipts
      WHERE grn_number ~ '^GRN-[0-9]+$'
    ),
    1
  ),
  false
);
--> statement-breakpoint

UPDATE public.policy_settings
SET value_text = 'GRN-', updated_at = NOW()
WHERE key = 'grn_number_prefix'
  AND value_text = 'GRN';
