UPDATE public.import_purchase_orders
SET status = 'lc_applied'
WHERE lc_id IS NOT NULL
  AND status = 'approved';
