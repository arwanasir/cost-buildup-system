import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class AllocationService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getAllocatedAmountEtb(
    shipmentItemId: string,
    categoryCodes: string[],
  ): Promise<string> {
    const allocations = await this.db
      .select({
        allocatedEtb: schema.costAllocations.allocatedEtb,
        code: schema.costCategories.code,
      })
      .from(schema.costAllocations)
      .innerJoin(
        schema.importCostEntries,
        eq(schema.costAllocations.costEntryId, schema.importCostEntries.id),
      )
      .innerJoin(
        schema.costCategories,
        eq(schema.importCostEntries.costCategoryId, schema.costCategories.id),
      )
      .where(
        and(
          eq(schema.costAllocations.shipmentItemId, shipmentItemId),
          inArray(schema.costCategories.code, categoryCodes),
        ),
      );

    let total = new Decimal(0);
    for (const alloc of allocations) {
      total = total.plus(alloc.allocatedEtb || 0);
    }
    return total.toString();
  }
}
