import {
  Injectable,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LANDED_COST_FORMULA } from './landed-cost.constants';
import { AllocationService } from '@/allocation/allocation.service';
import { FinalisationGuardService } from './finalisation-guard.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class LandedCostService {
  constructor(
    private readonly allocationService: AllocationService,
    private readonly finalisationGuard: FinalisationGuardService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  getFormulaDocumentation(): string {
    return LANDED_COST_FORMULA.DOCUMENTATION;
  }

  async computeDraft(shipmentId: string) {
    await this.allocationService.allocateShipment(shipmentId);
    return this.db.transaction(async (tx: any) => {
      return this._executeCalculationEngine(tx, shipmentId, false, undefined);
    });
  }

  async finalise(shipmentId: string, actor: { id: string; role: string }) {
    if (actor.role !== 'finance_manager' && actor.role !== 'general_manager') {
      throw new ForbiddenException(
        'Only Finance Manager or General Manager can finalize landed costs.',
      );
    }

    const blockers = await this.finalisationGuard.check(shipmentId);
    if (blockers.length > 0) {
      throw new BadRequestException({
        message: 'Finalisation blocked due to unresolved constraints.',
        blockers,
      });
    }

    await this.allocationService.allocateShipment(shipmentId);

    const now = new Date().toISOString();

    const results = await this.db.transaction(async (tx: any) => {
      const computed = await this._executeCalculationEngine(
        tx,
        shipmentId,
        true,
        { actorId: actor.id, timestamp: now },
      );

      await tx
        .update(schema.importShipments)
        .set({ isFinalised: true, finalisedBy: actor.id, finalisedAt: now })
        .where(eq(schema.importShipments.id, shipmentId));

      return computed;
    });

    this.eventEmitter.emit('landedCost.finalised', {
      shipmentId,
      actorId: actor.id,
      timestamp: now,
    });
    return results;
  }

  private async _executeCalculationEngine(
    tx: any,
    shipmentId: string,
    useAcceptedQuantity: boolean,
    finaliseMeta?: { actorId: string; timestamp: string },
  ) {
    const items = await tx
      .select()
      .from(schema.shipmentItems)
      .where(eq(schema.shipmentItems.shipmentId, shipmentId));
    if (items.length === 0) return [];

    const [confirmedGrn] = await tx
      .select()
      .from(schema.goodsReceipts)
      .where(
        and(
          eq(schema.goodsReceipts.shipmentId, shipmentId),
          inArray(schema.goodsReceipts.status, [
            'confirmed',
            'flagged_for_adjustment',
          ]),
        ),
      );

    const grnItemsMap = new Map();
    if (confirmedGrn) {
      const gItems = await tx
        .select()
        .from(schema.goodsReceiptItems)
        .where(eq(schema.goodsReceiptItems.grnId, confirmedGrn.id));
      gItems.forEach((gi: any) =>
        grnItemsMap.set(
          gi.shipmentItemId,
          useAcceptedQuantity ? gi.acceptedQuantity : gi.receivedQuantity,
        ),
      );
    }

    const allocations = await tx
      .select({
        shipmentItemId: schema.costAllocations.shipmentItemId,
        allocatedEtb: schema.costAllocations.allocatedEtb,
        categoryCode: schema.costCategories.code,
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
          eq(schema.importCostEntries.shipmentId, shipmentId),
          isNull(schema.importCostEntries.reversedByEntryId),
        ),
      );

    const allocationsByItem = new Map();
    items.forEach((item: any) => {
      allocationsByItem.set(item.id, {
        customsDutyEtb: new Decimal(0),
        importVatEtb: new Decimal(0),
        freightAllocatedEtb: new Decimal(0),
        insuranceAllocatedEtb: new Decimal(0),
        bankChargesAllocatedEtb: new Decimal(0),
        portChargesAllocatedEtb: new Decimal(0),
        clearingFeeAllocatedEtb: new Decimal(0),
        otherChargesAllocatedEtb: new Decimal(0),
      });
    });

    allocations.forEach((alloc: any) => {
      const itemCosts = allocationsByItem.get(alloc.shipmentItemId);
      if (!itemCosts) return;

      const amount = new Decimal(String(alloc.allocatedEtb));
      switch (alloc.categoryCode) {
        case 'CUSTOMS_DUTY':
          itemCosts.customsDutyEtb = itemCosts.customsDutyEtb.plus(amount);
          break;
        case 'VAT':
          itemCosts.importVatEtb = itemCosts.importVatEtb.plus(amount);
          break;
        case 'FREIGHT':
          itemCosts.freightAllocatedEtb =
            itemCosts.freightAllocatedEtb.plus(amount);
          break;
        case 'INSURANCE':
          itemCosts.insuranceAllocatedEtb =
            itemCosts.insuranceAllocatedEtb.plus(amount);
          break;
        case 'BANK':
        case 'BANK_CHARGES':
          itemCosts.bankChargesAllocatedEtb =
            itemCosts.bankChargesAllocatedEtb.plus(amount);
          break;
        case 'PORT':
        case 'PORT_HANDLING':
          itemCosts.portChargesAllocatedEtb =
            itemCosts.portChargesAllocatedEtb.plus(amount);
          break;
        case 'CLEARING':
        case 'TRANSIT':
          itemCosts.clearingFeeAllocatedEtb =
            itemCosts.clearingFeeAllocatedEtb.plus(amount);
          break;
        default:
          itemCosts.otherChargesAllocatedEtb =
            itemCosts.otherChargesAllocatedEtb.plus(amount);
          break;
      }
    });

    const activeEntries = await tx
      .select()
      .from(schema.importCostEntries)
      .where(
        and(
          eq(schema.importCostEntries.shipmentId, shipmentId),
          isNull(schema.importCostEntries.reversedByEntryId),
        ),
      );

    let totalCostEntriesEtb = new Decimal(0);
    for (const entry of activeEntries) {
      totalCostEntriesEtb = totalCostEntriesEtb.plus(entry.amountEtb);
    }

    const landedCostResults = [];
    let totalAllocatedEtb = new Decimal(0);

    for (const item of items) {
      const costs = allocationsByItem.get(item.id);

      const grnQty = grnItemsMap.get(item.id);
      const qtyReceived = new Decimal(
        String(grnQty !== undefined ? grnQty : item.shippedQuantity),
      );

      const ciValue = new Decimal(String(item.ciValueEtb));

      const totalLandedCost = ciValue
        .plus(costs.customsDutyEtb)
        .plus(costs.importVatEtb)
        .plus(costs.freightAllocatedEtb)
        .plus(costs.insuranceAllocatedEtb)
        .plus(costs.bankChargesAllocatedEtb)
        .plus(costs.portChargesAllocatedEtb)
        .plus(costs.clearingFeeAllocatedEtb)
        .plus(costs.otherChargesAllocatedEtb);

      const perUnit = qtyReceived.isZero()
        ? new Decimal(0)
        : totalLandedCost.dividedBy(qtyReceived);

      const allocatedAmount = totalLandedCost.minus(ciValue);
      totalAllocatedEtb = totalAllocatedEtb.plus(allocatedAmount);

      landedCostResults.push({
        shipmentId: shipmentId,
        itemId: item.itemId,
        poLineId: item.poLineId,
        shipmentItemId: item.id,
        quantityReceived: qtyReceived.toFixed(4),
        ciValueEtb: ciValue.toFixed(4),
        customsDutyEtb: costs.customsDutyEtb.toFixed(4),
        importVatEtb: costs.importVatEtb.toFixed(4),
        freightAllocatedEtb: costs.freightAllocatedEtb.toFixed(4),
        insuranceAllocatedEtb: costs.insuranceAllocatedEtb.toFixed(4),
        bankChargesAllocatedEtb: costs.bankChargesAllocatedEtb.toFixed(4),
        portChargesAllocatedEtb: costs.portChargesAllocatedEtb.toFixed(4),
        clearingFeeAllocatedEtb: costs.clearingFeeAllocatedEtb.toFixed(4),
        otherChargesAllocatedEtb: costs.otherChargesAllocatedEtb.toFixed(4),
        totalLandedCostEtb: totalLandedCost.toFixed(4),
        perUnitLandedCostEtb: perUnit.toFixed(6),
        isEstimated: finaliseMeta ? false : true,
        isFinalised: finaliseMeta ? true : false,
        finalisedBy: finaliseMeta ? finaliseMeta.actorId : null,
        finalisedAt: finaliseMeta ? finaliseMeta.timestamp : null,
      });
    }

    const discrepancy = totalCostEntriesEtb.minus(totalAllocatedEtb).abs();
    if (discrepancy.greaterThan(new Decimal('0.0001'))) {
      throw new InternalServerErrorException(
        `Reconciliation Error: The sum of aggregated landed costs (${totalAllocatedEtb.toFixed(4)} ETB) ` +
          `deviates from the sum of active cost entries (${totalCostEntriesEtb.toFixed(4)} ETB) by ${discrepancy.toFixed(6)}. ` +
          `This exceeds the 0.0001 ETB rounding threshold.`,
      );
    }

    await tx
      .delete(schema.importLandedCostResults)
      .where(eq(schema.importLandedCostResults.shipmentId, shipmentId));
    if (landedCostResults.length > 0) {
      await tx.insert(schema.importLandedCostResults).values(landedCostResults);
    }

    return landedCostResults;
  }

  async getLandedCostResults(shipmentId: string) {
    return this.db
      .select()
      .from(schema.importLandedCostResults)
      .where(eq(schema.importLandedCostResults.shipmentId, shipmentId));
  }
}
