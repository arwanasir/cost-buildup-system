ALTER TABLE "import_landed_cost_results"
  ALTER COLUMN "per_unit_landed_cost_etb" TYPE numeric(18, 4)
  USING round("per_unit_landed_cost_etb", 4);

ALTER TABLE "goods_receipt_items"
  ALTER COLUMN "per_unit_landed_cost_etb" TYPE numeric(18, 4)
  USING round("per_unit_landed_cost_etb", 4);
