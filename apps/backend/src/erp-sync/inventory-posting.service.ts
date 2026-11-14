import { NotificationsService } from '../notifications/notifications.service';
import { InventoryClient } from './clients/inventory.client';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryPostingService {
  private readonly logger = new Logger(InventoryPostingService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly notificationsService: NotificationsService,
    private readonly inventoryClient: InventoryClient,
  ) {}

  async getPayloadForGrn(grnIdentifier: string, useFinalCosts = false) {
    let grn;
    if (
      grnIdentifier.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      const results = await this.db
        .select()
        .from(schema.goodsReceipts)
        .where(eq(schema.goodsReceipts.id, grnIdentifier));
      if (results.length > 0) grn = results[0];
    }
    if (!grn) {
      const results = await this.db
        .select()
        .from(schema.goodsReceipts)
        .where(eq(schema.goodsReceipts.grnNumber, grnIdentifier));
      if (results.length > 0) grn = results[0];
    }
    if (!grn) throw new Error('GRN ' + grnIdentifier + ' not found');

    const grnItems = await this.db
      .select()
      .from(schema.goodsReceiptItems)
      .where(eq(schema.goodsReceiptItems.grnId, grn.id));
    if (grnItems.length === 0) return { items: [] };

    const shipmentItemIds = grnItems.map((i: any) => i.shipmentItemId);
    const shipmentItems = await this.db
      .select()
      .from(schema.shipmentItems)
      .where(inArray(schema.shipmentItems.id, shipmentItemIds));
    const shipmentItemMap = new Map(
      shipmentItems.map((si: any) => [si.id, si]),
    );

    const lcResults = await this.db
      .select()
      .from(schema.importLandedCostResults)
      .where(eq(schema.importLandedCostResults.shipmentId, grn.shipmentId));
    const lcMap = new Map<string, any>(
      lcResults.map((lc: any) => [lc.shipmentItemId, lc]),
    );

    const payloads = [];
    for (const item of grnItems) {
      const acceptedQty = new Decimal(String(item.acceptedQuantity));
      if (acceptedQty.isZero()) continue;
      const si: any = shipmentItemMap.get(item.shipmentItemId);
      if (!si) {
        if (useFinalCosts) {
          throw new Error(
            `Shipment item ${item.shipmentItemId} is missing for final inventory posting`,
          );
        }
        continue;
      }
      const lc: any = lcMap.get(item.shipmentItemId);
      if (useFinalCosts && !lc?.perUnitLandedCostEtb) {
        throw new Error(
          `Final landed cost is missing for shipment item ${item.shipmentItemId}`,
        );
      }
      const costBreakdown = lc
        ? {
            ci_value_etb: lc.ciValueEtb,
            customs_duty_etb: lc.customsDutyEtb,
            import_vat_etb: lc.importVatEtb,
            freight_allocated_etb: lc.freightAllocatedEtb,
            insurance_allocated_etb: lc.insuranceAllocatedEtb,
            bank_charges_allocated_etb: lc.bankChargesAllocatedEtb,
            port_charges_allocated_etb: lc.portChargesAllocatedEtb,
            clearing_fee_allocated_etb: lc.clearingFeeAllocatedEtb,
            other_charges_allocated_etb: lc.otherChargesAllocatedEtb,
            total_landed_cost_etb: lc.totalLandedCostEtb,
          }
        : {};
      payloads.push({
        grn_id: grn.grnNumber,
        shipment_id: grn.shipmentId,
        item_id: si.itemId,
        shipment_item_id: si.id,
        quantity_received: acceptedQty.toString(),
        per_unit_landed_cost_etb:
          useFinalCosts && lc?.perUnitLandedCostEtb
            ? lc.perUnitLandedCostEtb
            : item.perUnitLandedCostEtb,
        cost_breakdown_json: costBreakdown,
      });
    }
    return { items: payloads, grn };
  }

  /**
   * Corrects inventory unit costs after an estimated-cost GRN is finalized
   * and its adjustment journal is approved by Finance. The adjustment ID is
   * stable so the ERP can safely de-duplicate retries.
   */
  async postFinalCostAdjustment(grnId: string, adjustmentId: string) {
    const [grn] = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.id, grnId));
    if (!grn) throw new Error(`GRN ${grnId} not found`);

    const grnItems = await this.db
      .select()
      .from(schema.goodsReceiptItems)
      .where(eq(schema.goodsReceiptItems.grnId, grnId));
    const acceptedItems = grnItems.filter((item: any) =>
      new Decimal(String(item.acceptedQuantity)).greaterThan(0),
    );
    if (acceptedItems.length === 0) {
      throw new Error(
        `GRN ${grn.grnNumber} has no accepted quantity to adjust`,
      );
    }

    const shipmentItemIds = acceptedItems.map(
      (item: any) => item.shipmentItemId,
    );
    const [shipmentItems, landedCostRows] = await Promise.all([
      this.db
        .select()
        .from(schema.shipmentItems)
        .where(inArray(schema.shipmentItems.id, shipmentItemIds)),
      this.db
        .select()
        .from(schema.importLandedCostResults)
        .where(eq(schema.importLandedCostResults.shipmentId, grn.shipmentId)),
    ]);
    const shipmentItemById = new Map<string, any>(
      shipmentItems.map((item: any) => [item.id, item]),
    );
    const landedCostByShipmentItem = new Map<string, any>(
      landedCostRows.map((row: any) => [row.shipmentItemId, row]),
    );
    const missingLandedCostItem = acceptedItems.find(
      (item: any) =>
        !landedCostByShipmentItem.get(item.shipmentItemId)
          ?.perUnitLandedCostEtb,
    );
    if (missingLandedCostItem) {
      throw new Error(
        `Final landed cost is missing for GRN item ${missingLandedCostItem.id}`,
      );
    }

    const postedCount = acceptedItems.filter((item: any) => {
      const landedCost: any = landedCostByShipmentItem.get(item.shipmentItemId);
      return landedCost?.postedToInventory;
    }).length;
    if (postedCount === 0) {
      // The original GRN posting never reached Inventory. Send the finalized
      // receipt once, at its final unit cost, rather than sending an adjustment
      // for stock that does not exist in the ERP yet.
      return this.post(grnId, undefined, true);
    }
    if (postedCount !== acceptedItems.length) {
      throw new Error(
        `Inventory posting is incomplete for GRN ${grn.grnNumber}; retry its original posting before applying a cost adjustment`,
      );
    }

    const adjustmentItems = acceptedItems.map((grnItem: any) => {
      const shipmentItem: any = shipmentItemById.get(grnItem.shipmentItemId);
      const landedCost: any = landedCostByShipmentItem.get(
        grnItem.shipmentItemId,
      );
      if (!shipmentItem || !landedCost) {
        throw new Error(
          `Final landed cost data is missing for GRN item ${grnItem.id}`,
        );
      }

      const acceptedQuantity = new Decimal(String(grnItem.acceptedQuantity));
      const finalUnitCost = new Decimal(
        String(landedCost.perUnitLandedCostEtb),
      );
      return {
        shipment_item_id: grnItem.shipmentItemId,
        item_id: shipmentItem.itemId,
        quantity_received: acceptedQuantity.toFixed(4),
        previous_per_unit_landed_cost_etb: new Decimal(
          String(grnItem.perUnitLandedCostEtb),
        ).toFixed(4),
        per_unit_landed_cost_etb: finalUnitCost.toFixed(4),
        line_value_etb: acceptedQuantity.times(finalUnitCost).toFixed(4),
        cost_breakdown_json: {
          ci_value_etb: landedCost.ciValueEtb,
          customs_duty_etb: landedCost.customsDutyEtb,
          import_vat_etb: landedCost.importVatEtb,
          freight_allocated_etb: landedCost.freightAllocatedEtb,
          insurance_allocated_etb: landedCost.insuranceAllocatedEtb,
          bank_charges_allocated_etb: landedCost.bankChargesAllocatedEtb,
          port_charges_allocated_etb: landedCost.portChargesAllocatedEtb,
          clearing_fee_allocated_etb: landedCost.clearingFeeAllocatedEtb,
          other_charges_allocated_etb: landedCost.otherChargesAllocatedEtb,
          total_landed_cost_etb: landedCost.totalLandedCostEtb,
        },
      };
    });

    const response = await this.inventoryClient.postCostAdjustment(
      adjustmentId,
      grn.grnNumber,
      grn.shipmentId,
      adjustmentItems,
    );
    const transactionId =
      response?.inventory_transaction_id ||
      response?.transaction_id ||
      response?.postingId;
    if (!transactionId || response?.status === 'error') {
      throw new Error(
        response?.message ||
          'Inventory ERP did not confirm the final cost adjustment',
      );
    }

    await this.db
      .update(schema.importLandedCostResults)
      .set({ inventoryAdjustmentTransactionId: transactionId })
      .where(
        and(
          eq(schema.importLandedCostResults.shipmentId, grn.shipmentId),
          inArray(
            schema.importLandedCostResults.shipmentItemId,
            shipmentItemIds,
          ),
        ),
      );

    return response;
  }

  async post(grnId: string, existingLogId?: string, useFinalCosts = false) {
    const { items: payloads, grn } = await this.getPayloadForGrn(
      grnId,
      useFinalCosts,
    );
    if (payloads.length === 0) return;

    let log: any;
    if (existingLogId) {
      const existing = await this.db
        .select()
        .from(schema.erpSyncLog)
        .where(eq(schema.erpSyncLog.id, existingLogId));
      if (!existing.length) throw new Error('Sync log not found');
      log = existing[0];
    } else {
      const [newLog] = await this.db
        .insert(schema.erpSyncLog)
        .values({
          entityType: 'inventory_posting',
          entityId: grnId,
          payload: payloads,
          status: 'pending',
        })
        .returning();
      log = newLog;
    }

    try {
      this.logger.log(
        'Sending inventory posting for GRN ' + grn.grnNumber + ' to ERP...',
      );

      const responseJson = await this.inventoryClient.postReceipt(payloads);

      await this.db
        .update(schema.erpSyncLog)
        .set({
          status: 'success',
          response: responseJson,
          attempts: log.attempts + 1,
          sentAt: new Date().toISOString(),
          lastError: null,
        })
        .where(eq(schema.erpSyncLog.id, log.id));

      const invTxId =
        responseJson.inventory_transaction_id ||
        responseJson.transaction_id ||
        responseJson.postingId ||
        'INV-' + Date.now();

      await this.db
        .update(schema.goodsReceipts)
        .set({
          // Keep the cost-adjustment workflow visible after the inventory
          // module accepts a GRN posted at estimated cost.
          status: grn.usesEstimatedCost ? 'flagged_for_adjustment' : 'posted',
          postedAt: new Date().toISOString(),
        })
        .where(eq(schema.goodsReceipts.id, grnId));

      const shipmentItemIdsToUpdate = payloads.map((p) => p.shipment_item_id);

      if (shipmentItemIdsToUpdate.length > 0) {
        await this.db
          .update(schema.importLandedCostResults)
          .set({
            postedToInventory: true,
            postedAt: new Date().toISOString(),
            inventoryTransactionId: invTxId,
          })
          .where(
            and(
              eq(schema.importLandedCostResults.shipmentId, grn.shipmentId),
              inArray(
                schema.importLandedCostResults.shipmentItemId,
                shipmentItemIdsToUpdate,
              ),
            ),
          );
      }

      return { status: 'success', response: responseJson };
    } catch (error: any) {
      this.logger.error(
        'Failed to sync GRN ' + grn.grnNumber + ' to ERP: ' + error.message,
      );
      const nextAttempts = log.attempts + 1;
      const exhausted = nextAttempts >= 3;

      await this.db
        .update(schema.erpSyncLog)
        .set({
          status: exhausted ? 'failed' : 'pending',
          attempts: nextAttempts,
          lastError: error.message,
          sentAt: new Date().toISOString(),
        })
        .where(eq(schema.erpSyncLog.id, log.id));

      // The SRS requires the GRN to expose a posting failure as soon as the
      // inventory interface rejects it. The sync log remains pending for
      // automatic retry, and a successful retry restores the posted status.
      await this.db
        .update(schema.goodsReceipts)
        .set({ status: 'posting_failed' })
        .where(eq(schema.goodsReceipts.id, grnId));

      // Alert once on the initial failure; subsequent retry failures update
      // the same visible failure state without flooding administrators.
      if (nextAttempts === 1) {
        await this.notificationsService.notifyRoles(
          'posting_failed',
          { type: 'goods_receipt', id: grnId },
          {
            entityName: 'GRN ' + grn.grnNumber,
            reason: error.message.substring(0, 100),
          },
        );
      }

      if (exhausted) {
        this.logger.error(
          `Inventory posting retries exhausted for GRN ${grn.grnNumber}`,
        );
      }

      throw error;
    }
  }
}
