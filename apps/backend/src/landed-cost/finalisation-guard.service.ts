import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class FinalisationGuardService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Evaluates all BR constraints to determine if a shipment is eligible for financial finalization.
   * Returns an array of blocker strings. If the array is empty, finalization may proceed.
   */
  async check(shipmentId: string): Promise<string[]> {
    const blockers: string[] = [];

    // 1. Shipment Status Check (Not customs released)
    const [shipment] = await this.db
      .select()
      .from(schema.importShipments)
      .where(eq(schema.importShipments.id, shipmentId));
    if (!shipment) {
      return ['Shipment not found.'];
    }

    if (shipment.isFinalised) {
      return [
        'Shipment is already finalised. Finalisation is irreversible (BR02).',
      ];
    }

    const validFinalizeStatuses = ['customs_released', 'received', 'completed'];
    if (!validFinalizeStatuses.includes(shipment.status)) {
      blockers.push(
        `Shipment status is '${shipment.status}'. Must be at least 'customs_released' to finalize costs.`,
      );
    }

    // 2. BR05: Estimated entries remaining
    const estimatedEntries = await this.db
      .select({ id: schema.importCostEntries.id })
      .from(schema.importCostEntries)
      .where(
        and(
          eq(schema.importCostEntries.shipmentId, shipmentId),
          eq(schema.importCostEntries.isEstimated, true),
          isNull(schema.importCostEntries.reversedByEntryId),
        ),
      );

    if (estimatedEntries.length > 0) {
      const ids = estimatedEntries.map((e: any) => e.id).join(', ');
      blockers.push(
        `BR05: Cannot finalize with estimated costs. Found ${estimatedEntries.length} estimated entries: [${ids}].`,
      );
    }

    // 3. BR07: Pending variances above threshold
    const pendingVariances = await this.db
      .select()
      .from(schema.costVariances)
      .where(
        and(
          eq(schema.costVariances.shipmentId, shipmentId),
          eq(schema.costVariances.status, 'pending_approval'),
        ),
      );
    if (pendingVariances.length > 0) {
      blockers.push(
        `BR07: Found ${pendingVariances.length} pending cost variance(s) requiring approval.`,
      );
    }

    // 4. No confirmed GRN
    const confirmedGrns = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(
        and(
          eq(schema.goodsReceipts.shipmentId, shipmentId),
          eq(schema.goodsReceipts.status, 'confirmed'),
        ),
      );
    if (confirmedGrns.length === 0) {
      blockers.push(
        'No confirmed Goods Receiving Note (GRN) found for this shipment.',
      );
    }

    // 5. BR11: Unacknowledged Price Variance
    const [policy] = await this.db
      .select()
      .from(schema.policySettings)
      .where(eq(schema.policySettings.key, 'ci_price_variance_pct'));
    const threshold = policy
      ? new Decimal(String(policy.valueNumeric || 0))
      : new Decimal(0);

    const items = await this.db
      .select()
      .from(schema.shipmentItems)
      .where(eq(schema.shipmentItems.shipmentId, shipmentId));

    const unacknowledgedItems = items.filter((item: any) => {
      if (item.varianceAcknowledgedBy) return false;
      const pct = new Decimal(String(item.priceVariancePct || 0)).abs();
      return pct.greaterThan(threshold);
    });

    if (unacknowledgedItems.length > 0) {
      const itemIds = unacknowledgedItems.map((i: any) => i.id).join(', ');
      blockers.push(
        `BR11: Found ${unacknowledgedItems.length} shipment item(s) with unacknowledged price variances exceeding the ${threshold.toString()}% threshold: [${itemIds}].`,
      );
    }

    return blockers;
  }
}
