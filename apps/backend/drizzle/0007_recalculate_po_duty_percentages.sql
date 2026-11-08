-- Recalculate the persisted derived duty estimate after correcting the
-- percentage interpretation in PoCalculationService. Tariff rates are stored
-- as percentages (for example, 20 means 20%), not decimal fractions.
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS entry_type varchar(40) NOT NULL DEFAULT 'standard';

-- Tag adjustment journals created before they had an explicit discriminator.
-- Ordinary GRN posting journals have three lines including Accounts Payable;
-- landed-cost adjustments have only the Inventory/Accrued Charges pair.
UPDATE journal_entries
SET entry_type = 'landed_cost_adjustment'
WHERE source_type = 'grn'
  AND jsonb_typeof(lines) = 'array'
  AND jsonb_array_length(lines) = 2
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(journal_entries.lines) AS entry_line(value)
    WHERE entry_line.value->>'account_code' = '1000-INV'
  )
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(journal_entries.lines) AS entry_line(value)
    WHERE entry_line.value->>'account_code' = '2001-ACC'
  );

-- Restore inventory-posted flags lost when older calculations deleted and
-- recreated landed-cost result rows. Only successful ERP logs containing the
-- exact shipment item are treated as proof that the item was posted.
WITH successful_item_posts AS (
  SELECT DISTINCT ON (log.entity_id, payload_item->>'shipment_item_id')
    log.entity_id AS grn_id,
    payload_item->>'shipment_item_id' AS shipment_item_id,
    log.sent_at,
    log.response
  FROM erp_sync_log log
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(log.payload) = 'array' THEN log.payload
      ELSE '[]'::jsonb
    END
  ) AS payload_item
  WHERE log.entity_type = 'inventory_posting'
    AND log.status = 'success'
  ORDER BY
    log.entity_id,
    payload_item->>'shipment_item_id',
    log.sent_at DESC NULLS LAST
)
UPDATE import_landed_cost_results result
SET
  posted_to_inventory = TRUE,
  posted_at = COALESCE(successful.sent_at, grn.posted_at),
  inventory_transaction_id = COALESCE(
    successful.response->>'inventory_transaction_id',
    successful.response->>'transaction_id'
  )
FROM successful_item_posts successful
JOIN goods_receipts grn ON grn.id = successful.grn_id
WHERE result.shipment_id = grn.shipment_id
  AND result.shipment_item_id::text = successful.shipment_item_id;

WITH corrected_duty AS (
  SELECT
    po.id AS po_id,
    COALESCE(
      SUM(
        CASE
          WHEN COALESCE(po.total_value_foreign, 0) = 0 THEN 0
          ELSE
            (COALESCE(line.total_line_value, 0) / po.total_value_foreign)
            * (
              COALESCE(po.total_value_etb, 0)
              + COALESCE(po.estimated_freight_etb, 0)
              + COALESCE(po.estimated_insurance_etb, 0)
            )
            * COALESCE(line.estimated_duty_rate, 0) / 100
        END
      ),
      0
    ) AS duty_etb
  FROM import_purchase_orders po
  LEFT JOIN po_lines line ON line.po_id = po.id
  GROUP BY po.id
)
UPDATE import_purchase_orders po
SET estimated_duty_etb = ROUND(corrected_duty.duty_etb, 4)
FROM corrected_duty
WHERE po.id = corrected_duty.po_id
  AND po.estimated_duty_etb IS DISTINCT FROM ROUND(corrected_duty.duty_etb, 4);

-- Refresh previously stored duty variances so the obsolete percentage-based
-- estimate cannot leave a false approval blocker behind. Corrected rows are
-- reclassified using the configured threshold and require a fresh decision
-- only when the corrected variance remains above that threshold.
WITH corrected_variances AS (
  SELECT
    variance.id AS variance_id,
    po.estimated_duty_etb AS estimated_etb,
    variance.actual_etb,
    CASE
      WHEN denominator.total_estimated_etb = 0 THEN 0
      ELSE
        ((variance.actual_etb - po.estimated_duty_etb)
          / denominator.total_estimated_etb) * 100
    END AS variance_pct,
    COALESCE(threshold.value_numeric, 2.00) AS threshold_pct
  FROM cost_variances variance
  JOIN import_shipments shipment ON shipment.id = variance.shipment_id
  JOIN import_purchase_orders po ON po.id = shipment.po_id
  LEFT JOIN policy_settings threshold
    ON threshold.key = 'variance_threshold_pct'
  CROSS JOIN LATERAL (
    SELECT
      po.total_value_etb
      + COALESCE(po.estimated_freight_etb, 0)
      + COALESCE(po.estimated_insurance_etb, 0)
      + COALESCE(po.estimated_other_charge_etb, 0)
      + COALESCE(po.estimated_duty_etb, 0) AS total_estimated_etb
  ) denominator
  WHERE variance.variance_type = 'duty'
    AND variance.estimated_etb IS DISTINCT FROM po.estimated_duty_etb
)
UPDATE cost_variances variance
SET
  estimated_etb = corrected.estimated_etb,
  variance_etb = corrected.actual_etb - corrected.estimated_etb,
  variance_pct = ROUND(corrected.variance_pct, 6),
  status = CASE
    WHEN ABS(corrected.variance_pct) <= corrected.threshold_pct
      THEN 'auto_approved'::variance_status_enum
    ELSE 'pending_approval'::variance_status_enum
  END,
  approver_id = NULL,
  decided_at = NULL,
  comment = NULL
FROM corrected_variances corrected
WHERE variance.id = corrected.variance_id;
