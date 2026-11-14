ALTER TABLE public.import_landed_cost_results
  ADD COLUMN IF NOT EXISTS inventory_adjustment_transaction_id varchar(100);
