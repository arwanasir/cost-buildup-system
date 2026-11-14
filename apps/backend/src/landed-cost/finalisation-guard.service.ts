import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq, and, inArray, isNull } from 'drizzle-orm';
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

    const validFinalizeStatuses = ['cleared', 'partially_received', 'received'];
    if (!validFinalizeStatuses.includes(shipment.status)) {
      blockers.push(
        `Shipment status is '${shipment.status}'. Must be at least 'cleared' to finalize costs.`,
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
          isNull(schema.importCostEntries.estimateAcceptedBy),
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
          inArray(schema.costVariances.status, [
            'pending_approval',
            'rejected',
          ]),
        ),
      );
    if (pendingVariances.length > 0) {
      blockers.push(
        `BR07: Found ${pendingVariances.length} unresolved cost variance(s) (pending approval or rejected) requiring Finance Manager approval before finalisation.`,
      );
    }

    // 4. No confirmed GRN
    const confirmedGrns = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(
        and(
          eq(schema.goodsReceipts.shipmentId, shipmentId),
          inArray(schema.goodsReceipts.status, [
            'confirmed',
            'posted',
            'posting_failed',
            'flagged_for_adjustment',
          ]),
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

    const commercialInvoices = await this.db
      .select()
      .from(schema.commercialInvoices)
      .where(eq(schema.commercialInvoices.shipmentId, shipmentId));

    const unacknowledgedInvoices = commercialInvoices.filter((invoice: any) => {
      if (invoice.varianceAcknowledgedBy) return false;
      const pct = new Decimal(String(invoice.priceVariancePct || 0)).abs();
      return pct.greaterThan(threshold);
    });

    if (unacknowledgedInvoices.length > 0) {
      const invoiceIds = unacknowledgedInvoices
        .map((ci: any) => ci.id)
        .join(', ');
      blockers.push(
        `BR11: Found ${unacknowledgedInvoices.length} commercial invoice(s) with unacknowledged price variances exceeding the ${threshold.toString()}% threshold: [${invoiceIds}].`,
      );
    }

    return blockers;
  }
}
