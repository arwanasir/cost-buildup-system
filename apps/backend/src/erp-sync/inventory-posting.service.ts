import { NotificationsService } from '../notifications/notifications.service';
import { InventoryClient } from './clients/inventory.client';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE } from '@/db';
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

  async getPayloadForGrn(grnIdentifier: string) {
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
    const lcMap = new Map(lcResults.map((lc: any) => [lc.shipmentItemId, lc]));

    const payloads = [];
    for (const item of grnItems) {
      const acceptedQty = new Decimal(String(item.acceptedQuantity));
      if (acceptedQty.isZero()) continue;
      const si: any = shipmentItemMap.get(item.shipmentItemId);
      if (!si) continue;
      const lc: any = lcMap.get(item.shipmentItemId);
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
        per_unit_landed_cost_etb: item.perUnitLandedCostEtb,
        cost_breakdown_json: costBreakdown,
      });
    }
    return { items: payloads, grn };
  }

  async post(grnId: string, existingLogId?: string) {
    const { items: payloads, grn } = await this.getPayloadForGrn(grnId);
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

      const invTxId = responseJson.transaction_id || 'INV-' + Date.now();

      await this.db
        .update(schema.goodsReceipts)
        .set({ status: 'posted', postedAt: new Date().toISOString() })
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

      if (exhausted) {
        await this.db
          .update(schema.goodsReceipts)
          .set({ status: 'posting_failed' })
          .where(eq(schema.goodsReceipts.id, grnId));

        await this.notificationsService.notifyRoles(
          'posting_failed',
          { type: 'goods_receipt', id: grnId },
          {
            entityName: 'GRN ' + grn.grnNumber,
            reason: error.message.substring(0, 100),
          },
        );
      }

      throw error;
    }
  }
}
