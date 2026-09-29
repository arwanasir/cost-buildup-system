import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import Decimal from 'decimal.js';

export interface DiscrepancyResult {
  shipmentItemId: string;
  receivedQuantity: string;
  shippedQuantity: string;
  poQuantity: string;
  flag: string;
}

@Injectable()
export class QuantityDiscrepancyService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async analyzeAndStoreDiscrepancies(
    grnId: string,
  ): Promise<DiscrepancyResult[]> {
    return this.db.transaction(async (tx: any) => {
      const grnItems = await tx
        .select()
        .from(schema.goodsReceiptItems)
        .where(eq(schema.goodsReceiptItems.grnId, grnId));
      if (grnItems.length === 0) return [];

      const shipmentItemIds = grnItems.map((gi: any) => gi.shipmentItemId);
      const shipmentItems = await tx
        .select()
        .from(schema.shipmentItems)
        .where(inArray(schema.shipmentItems.id, shipmentItemIds));

      const poLineIds = shipmentItems.map((si: any) => si.poLineId);
      const poLines = await tx
        .select()
        .from(schema.poLines)
        .where(inArray(schema.poLines.id, poLineIds));

      const poLineMap = new Map(poLines.map((pl: any) => [pl.id, pl]));
      const shipmentItemMap = new Map(
        shipmentItems.map((si: any) => [si.id, si]),
      );

      const results: DiscrepancyResult[] = [];

      for (const grnItem of grnItems) {
        const shipmentItem: any = shipmentItemMap.get(grnItem.shipmentItemId);
        if (!shipmentItem) continue;

        const poLine: any = poLineMap.get(shipmentItem.poLineId);

        const received = new Decimal(String(grnItem.receivedQuantity));
        const shipped = new Decimal(String(shipmentItem.shippedQuantity));
        const poQty = new Decimal(String(poLine ? poLine.quantity : 0));

        let flag = 'EXACT_MATCH';

        // Evaluate critical discrepancy against PO and Shipped
        if (received.greaterThan(poQty)) {
          flag = 'OVER_PO';
        } else if (received.lessThan(poQty)) {
          flag = 'SHORT_PO';
        } else if (received.greaterThan(shipped)) {
          flag = 'OVER_SHIPPED';
        } else if (received.lessThan(shipped)) {
          flag = 'SHORT_SHIPPED';
        }

        // Store flag onto the shipment item ledger (FR-09.1)
        await tx
          .update(schema.shipmentItems)
          .set({ quantityFlag: flag })
          .where(eq(schema.shipmentItems.id, shipmentItem.id));

        results.push({
          shipmentItemId: shipmentItem.id,
          receivedQuantity: received.toString(),
          shippedQuantity: shipped.toString(),
          poQuantity: poQty.toString(),
          flag,
        });
      }

      return results;
    });
  }
}
