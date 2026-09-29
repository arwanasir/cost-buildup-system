import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class CostSummaryService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getSummary(shipmentId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Verify shipment exists
      const [shipment] = await tx
        .select()
        .from(schema.importShipments)
        .where(eq(schema.importShipments.id, shipmentId));
      if (!shipment) throw new NotFoundException('Shipment not found');

      // 2. Fetch shipment items to calculate Supplier Cost
      const items = await tx
        .select()
        .from(schema.shipmentItems)
        .where(eq(schema.shipmentItems.shipmentId, shipmentId));

      let totalSupplierCostEtb = new Decimal(0);
      for (const item of items) {
        totalSupplierCostEtb = totalSupplierCostEtb.plus(item.ciValueEtb);
      }

      // 3. Fetch all cost entries and categories
      const costEntries = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.shipmentId, shipmentId));

      const categories = await tx.select().from(schema.costCategories);
      const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));

      // 4. Calculate additional charges by category, and Estimate vs Actuals
      let estimatedTotal = new Decimal(0);
      let actualTotal = new Decimal(0);
      let totalAdditionalChargesEtb = new Decimal(0);

      const chargesByCategory = new Map();

      for (const entry of costEntries) {
        // Exclude reversed entries to avoid double counting
        if (entry.reversedByEntryId) continue;

        const amountEtb = new Decimal(String(entry.amountEtb));
        totalAdditionalChargesEtb = totalAdditionalChargesEtb.plus(amountEtb);

        // Group by category
        const catName =
          categoryMap.get(entry.costCategoryId) || 'Unknown Category';
        const currentSum = chargesByCategory.get(catName) || new Decimal(0);
        chargesByCategory.set(catName, currentSum.plus(amountEtb));

        // Estimate vs Actual
        if (entry.isEstimated) {
          estimatedTotal = estimatedTotal.plus(amountEtb);
        } else {
          actualTotal = actualTotal.plus(amountEtb);
          // If it was previously estimated, add that to the estimated bucket for variance
          if (entry.previousEstimateEtb) {
            estimatedTotal = estimatedTotal.plus(entry.previousEstimateEtb);
          }
        }
      }

      // Format charges by category
      const chargesByCategoryFormatted = Array.from(
        chargesByCategory.entries(),
      ).map(([category, amount]) => ({
        category,
        amountEtb: amount.toFixed(4),
      }));

      // Variance Math: (Actual - Estimated)
      const varianceAmount = actualTotal.minus(estimatedTotal);
      let variancePercent = new Decimal(0);
      if (!estimatedTotal.isZero()) {
        variancePercent = varianceAmount.dividedBy(estimatedTotal).times(100);
      }

      // 5. Grand Total
      const grandTotalEtb = totalSupplierCostEtb.plus(
        totalAdditionalChargesEtb,
      );

      // 6. Draft Per-Unit Landed Cost Preview (Allocation by Value)
      const itemPreviews = items.map((item: any) => {
        const itemValue = new Decimal(item.ciValueEtb);
        const qty = new Decimal(item.shippedQuantity);

        // Simple draft allocation by value weight
        let allocatedCosts = new Decimal(0);
        if (!totalSupplierCostEtb.isZero()) {
          const weight = itemValue.dividedBy(totalSupplierCostEtb);
          allocatedCosts = totalAdditionalChargesEtb.times(weight);
        }

        const totalItemLandedCost = itemValue.plus(allocatedCosts);
        const perUnitLandedCost = qty.isZero()
          ? new Decimal(0)
          : totalItemLandedCost.dividedBy(qty);

        return {
          shipmentItemId: item.id,
          itemId: item.itemId,
          ciValueEtb: itemValue.toFixed(4),
          allocatedDraftCostsEtb: allocatedCosts.toFixed(4),
          totalItemLandedCostEtb: totalItemLandedCost.toFixed(4),
          perUnitLandedCostEtb: perUnitLandedCost.toFixed(4),
        };
      });

      // 7. Return complete payload
      return {
        shipmentId,
        totalSupplierCostEtb: totalSupplierCostEtb.toFixed(4),
        totalAdditionalChargesEtb: totalAdditionalChargesEtb.toFixed(4),
        grandTotalEtb: grandTotalEtb.toFixed(4),
        chargesByCategory: chargesByCategoryFormatted,
        variance: {
          estimatedTotalEtb: estimatedTotal.toFixed(4),
          actualTotalEtb: actualTotal.toFixed(4),
          varianceAmountEtb: varianceAmount.toFixed(4),
          variancePercent: variancePercent.toFixed(2),
        },
        itemPreviews,
      };
    });
  }
}
