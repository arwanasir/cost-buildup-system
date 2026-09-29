import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  AllocationBasisService,
  AllocationMethod,
} from './allocation-basis.service';
import Decimal from 'decimal.js';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';

export interface AllocationResult {
  shipmentItemId: string;
  allocatedAmount: string;
  isResidualHolder: boolean;
}

@Injectable()
export class AllocationService {
  constructor(
    private readonly basisService: AllocationBasisService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  allocateCost(
    amountToAllocate: string | number | any,
    items: any[],
    method: AllocationMethod,
  ): AllocationResult[] {
    const amount = new Decimal(String(amountToAllocate));
    if (amount.isZero() || items.length === 0) {
      return items.map((i) => ({
        shipmentItemId: i.id,
        allocatedAmount: '0.0000',
        isResidualHolder: false,
      }));
    }

    const basisList = this.basisService.getBasisValues(items, method);
    const totalBasis = this.basisService.getTotalBasis(basisList);

    if (totalBasis.isZero()) {
      throw new BadRequestException(
        `Cannot allocate cost using method '${method}' because the total aggregated basis across all items is zero.`,
      );
    }

    let allocatedTotal = new Decimal(0);
    const results = basisList.map((b) => {
      // Round intermediate calculations to 4 decimal places
      const itemShare = amount
        .times(b.basis)
        .dividedBy(totalBasis)
        .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
      allocatedTotal = allocatedTotal.plus(itemShare);

      return {
        shipmentItemId: b.itemId,
        allocatedAmount: itemShare,
        basis: b.basis,
        isResidualHolder: false,
      };
    });

    // Compute absolute residual due to rounding
    const residual = amount.minus(allocatedTotal);

    if (!residual.isZero() && results.length > 0) {
      // BR03 / FR-07.2: assign the rounding residual to the highest ci_value_etb item
      const highestCiValueItem = items.reduce((prev, current) => {
        const prevValue = new Decimal(String(prev.ciValueEtb || 0));
        const currentValue = new Decimal(String(current.ciValueEtb || 0));
        return prevValue.greaterThanOrEqualTo(currentValue) ? prev : current;
      }, items[0]);

      const residualHolderId = highestCiValueItem.id;
      const targetIndex = results.findIndex(
        (r) => r.shipmentItemId === residualHolderId,
      );

      if (targetIndex !== -1) {
        results[targetIndex].allocatedAmount =
          results[targetIndex].allocatedAmount.plus(residual);
        results[targetIndex].isResidualHolder = true;
      }
    }

    return results.map((r) => ({
      shipmentItemId: r.shipmentItemId,
      allocatedAmount: r.allocatedAmount.toFixed(4),
      isResidualHolder: r.isResidualHolder,
    }));
  }

  async allocateEntry(entryId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch entry
      const [entry] = await tx
        .select()
        .from(schema.importCostEntries)
        .where(eq(schema.importCostEntries.id, entryId));
      if (!entry) throw new NotFoundException('Cost entry not found');

      // 2. Fetch shipment items
      const items = await tx
        .select()
        .from(schema.shipmentItems)
        .where(eq(schema.shipmentItems.shipmentId, entry.shipmentId));
      if (!items || items.length === 0) return [];

      let allocationResults: AllocationResult[] = [];

      // 3. BR04: Direct allocation for item-specific entries
      if (entry.isItemSpecific || entry.allocationMethod === 'item_specific') {
        if (!entry.shipmentItemId) {
          throw new BadRequestException(
            'BR04: Item-specific cost entries must explicitly declare a shipmentItemId.',
          );
        }
        allocationResults = [
          {
            shipmentItemId: entry.shipmentItemId,
            allocatedAmount: new Decimal(entry.amountEtb).toFixed(4),
            isResidualHolder: false,
          },
        ];
      } else {
        // 4. Generate fractional allocations using core math rules for pooled costs
        allocationResults = this.allocateCost(
          entry.amountEtb,
          items,
          entry.allocationMethod as AllocationMethod,
        );
      }

      // 5. Clean up previous allocations for idempotency (FR-07.2)
      await tx
        .delete(schema.costAllocations)
        .where(eq(schema.costAllocations.costEntryId, entryId));

      // 6. Bulk insert new allocations
      if (allocationResults.length > 0) {
        const insertData = allocationResults.map((r) => ({
          costEntryId: entryId,
          shipmentItemId: r.shipmentItemId,
          allocationMethod: entry.allocationMethod,
          allocatedEtb: r.allocatedAmount,
          isResidualHolder: r.isResidualHolder,
        }));

        await tx.insert(schema.costAllocations).values(insertData);
      }

      return allocationResults;
    });
  }

  async allocateShipment(shipmentId: string) {
    return this.db.transaction(async (tx: any) => {
      // 1. Fetch shipment items
      const items = await tx
        .select()
        .from(schema.shipmentItems)
        .where(eq(schema.shipmentItems.shipmentId, shipmentId));
      if (!items || items.length === 0) {
        throw new BadRequestException(
          'Cannot mass allocate costs: Shipment has no items.',
        );
      }

      // 2. Fetch all valid, non-reversed cost entries for the shipment
      const entries = await tx
        .select()
        .from(schema.importCostEntries)
        .where(
          and(
            eq(schema.importCostEntries.shipmentId, shipmentId),
            isNull(schema.importCostEntries.reversedByEntryId),
          ),
        );

      if (entries.length === 0) return [];

      const allInsertData: any[] = [];

      // 3. Independent allocation logic per entry (FR-07.2)
      for (const entry of entries) {
        let results: AllocationResult[] = [];

        if (
          entry.isItemSpecific ||
          entry.allocationMethod === 'item_specific'
        ) {
          if (!entry.shipmentItemId) {
            throw new BadRequestException(
              `BR04: Item-specific cost entry ${entry.id} must explicitly declare a shipmentItemId.`,
            );
          }
          results = [
            {
              shipmentItemId: entry.shipmentItemId,
              allocatedAmount: new Decimal(String(entry.amountEtb)).toFixed(4),
              isResidualHolder: false,
            },
          ];
        } else {
          results = this.allocateCost(
            entry.amountEtb,
            items,
            entry.allocationMethod as AllocationMethod,
          );
        }

        results.forEach((r) => {
          allInsertData.push({
            costEntryId: entry.id,
            shipmentItemId: r.shipmentItemId,
            allocationMethod: entry.allocationMethod,
            allocatedEtb: r.allocatedAmount,
            isResidualHolder: r.isResidualHolder,
          });
        });
      }

      // 4. Wipe all previous allocations for these entries to maintain idempotency
      const entryIds = entries.map((e: any) => e.id);
      await tx
        .delete(schema.costAllocations)
        .where(inArray(schema.costAllocations.costEntryId, entryIds));

      // 5. Bulk insert the entirely freshly computed matrix
      if (allInsertData.length > 0) {
        await tx.insert(schema.costAllocations).values(allInsertData);
      }

      return allInsertData;
    });
  }

  async getAllocationsByEntry(entryId: string) {
    return this.db
      .select()
      .from(schema.costAllocations)
      .where(eq(schema.costAllocations.costEntryId, entryId));
  }

  async getAllocationsByShipment(shipmentId: string, itemId?: string) {
    const conditions = [eq(schema.shipmentItems.shipmentId, shipmentId)];
    if (itemId) {
      conditions.push(eq(schema.shipmentItems.itemId, itemId));
    }

    const results = await this.db
      .select({
        id: schema.costAllocations.id,
        costEntryId: schema.costAllocations.costEntryId,
        shipmentItemId: schema.costAllocations.shipmentItemId,
        allocationMethod: schema.costAllocations.allocationMethod,
        allocatedEtb: schema.costAllocations.allocatedEtb,
        isResidualHolder: schema.costAllocations.isResidualHolder,
        itemDetail: schema.shipmentItems,
      })
      .from(schema.costAllocations)
      .innerJoin(
        schema.shipmentItems,
        eq(schema.costAllocations.shipmentItemId, schema.shipmentItems.id),
      )
      .where(and(...conditions));

    return results;
  }
}
