import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class LineageService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getPoLineage(poLineId: string) {
    // 1. PO Line
    const [poLine] = await this.db
      .select()
      .from(schema.poLines)
      .where(eq(schema.poLines.id, poLineId));
    if (!poLine) throw new NotFoundException(`PO Line ${poLineId} not found`);

    // 2. Shipment Items
    const shipmentItems = await this.db
      .select()
      .from(schema.shipmentItems)
      .where(eq(schema.shipmentItems.poLineId, poLineId));

    const lineage = {
      poLine,
      shipmentItems: [] as any[],
    };

    for (const item of shipmentItems) {
      // 3. Allocations
      const costAllocations = await this.db
        .select()
        .from(schema.costAllocations)
        .where(eq(schema.costAllocations.shipmentItemId, item.id));

      // 4. Landed Cost Result
      const [landedCostResult] = await this.db
        .select()
        .from(schema.importLandedCostResults)
        .where(eq(schema.importLandedCostResults.shipmentItemId, item.id));

      lineage.shipmentItems.push({
        shipmentItem: item,
        costAllocations,
        landedCostResult: landedCostResult || null,
      });
    }

    return lineage;
  }
}
