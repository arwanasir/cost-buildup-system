import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { CreateGrnDto } from './dto/create-grn.dto';
import { QuantityDiscrepancyService } from './quantity-discrepancy.service';
import { LandedCostService } from '@/landed-cost/landed-cost.service';
import { InventoryPostingService } from '@/erp-sync/inventory-posting.service';
import { FinancePostingService } from '@/erp-sync/finance-posting.service';
import Decimal from 'decimal.js';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly quantityDiscrepancyService: QuantityDiscrepancyService,
    private readonly landedCostService: LandedCostService,
    private readonly inventoryPostingService: InventoryPostingService,
    private readonly financePostingService: FinancePostingService,
  ) {}

  async createGrn(dto: CreateGrnDto, actorId: string) {
    return this.db.transaction(async (tx: any) => {
      // Find the shipment to link PO
      const [shipment] = await tx
        .select()
        .from(schema.importShipments)
        .where(eq(schema.importShipments.id, dto.shipmentId));
      if (!shipment) throw new NotFoundException('Shipment not found');

      // BR01A: Customs release required
      const validStatuses = ['cleared', 'partially_received', 'received'];
      if (
        !validStatuses.includes(shipment.status) &&
        shipment.status !== 'customs_released'
      ) {
        throw new BadRequestException(
          `BR01A: Cannot receive goods. Shipment status '${shipment.status}' does not indicate customs release.`,
        );
      }

      // BR11: Unacknowledged Price Variance check
      const [policy] = await tx
        .select()
        .from(schema.policySettings)
        .where(eq(schema.policySettings.key, 'ci_price_variance_pct'));
      const threshold = policy
        ? new Decimal(String(policy.valueNumeric || 0))
        : new Decimal(0);

      const shipmentItems = await tx
        .select()
        .from(schema.shipmentItems)
        .where(eq(schema.shipmentItems.shipmentId, dto.shipmentId));

      const unacknowledgedItems = shipmentItems.filter((item: any) => {
        if (item.varianceAcknowledgedBy) return false;
        const pct = new Decimal(String(item.priceVariancePct || 0)).abs();
        return pct.greaterThan(threshold);
      });

      if (unacknowledgedItems.length > 0) {
        throw new BadRequestException(
          `BR11: Cannot receive goods. Shipment has ${unacknowledgedItems.length} unacknowledged price variance(s) exceeding ${threshold.toString()}%.`,
        );
      }

      // Generate GRN Number
      const grnNumber = `GRN-${Date.now()}`;

      // Insert GRN header (receivedBy maps to current warehouse_manager acting)
      const [grn] = await tx
        .insert(schema.goodsReceipts)
        .values({
          grnNumber,
          shipmentId: dto.shipmentId,
          poId: shipment.poId, // Derived implicitly
          receiptDate: dto.receiptDate,
          warehouseLocation: dto.warehouseLocation,
          receivedBy: actorId, // maps to current warehouse_manager
          inspectedBy: dto.inspectedBy || null,
          status: 'draft',
        })
        .returning();

      // FR-09.2: Validate GRN item metrics natively
      for (const item of dto.items) {
        const rcv = new Decimal(String(item.receivedQuantity));
        const acc = new Decimal(String(item.acceptedQuantity));
        const rej = new Decimal(String(item.rejectedQuantity));

        if (!acc.plus(rej).equals(rcv)) {
          throw new BadRequestException(
            `FR-09.2: For item ${item.shipmentItemId}, accepted_quantity (${acc.toString()}) + rejected_quantity (${rej.toString()}) must equal received_quantity (${rcv.toString()}).`,
          );
        }

        if (
          rej.greaterThan(0) &&
          (!item.rejectionReason || item.rejectionReason.trim() === '')
        ) {
          throw new BadRequestException(
            `FR-09.2: rejection_reason is strictly required for item ${item.shipmentItemId} because rejected_quantity is above 0.`,
          );
        }
      }

      // Insert GRN items
      const itemsToInsert = dto.items.map((item) => {
        const rej = new Decimal(String(item.rejectedQuantity));
        return {
          grnId: grn.id,
          shipmentItemId: item.shipmentItemId,
          receivedQuantity: item.receivedQuantity.toString(),
          acceptedQuantity: item.acceptedQuantity.toString(),
          rejectedQuantity: item.rejectedQuantity.toString(),
          inspectionResult: item.inspectionResult,
          rejectionReason: item.rejectionReason,
          quarantineFlag: rej.greaterThan(0),
          // Defaulting to 0; will be over-written upon actual inventory posting / landed cost finalisation
          perUnitLandedCostEtb: '0.000000',
          lineValueEtb: '0.0000',
        };
      });

      const grnItems = await tx
        .insert(schema.goodsReceiptItems)
        .values(itemsToInsert)
        .returning();

      const discrepancies =
        await this.quantityDiscrepancyService.analyzeAndStoreDiscrepancies(
          grn.id,
        );

      return { grn, items: grnItems, discrepancies };
    });
  }

  async confirmGrn(grnId: string, actorId: string) {
    const result = await this.db.transaction(async (tx: any) => {
      const [grn] = await tx
        .select()
        .from(schema.goodsReceipts)
        .where(eq(schema.goodsReceipts.id, grnId));
      if (!grn) throw new NotFoundException('GRN not found');
      if (grn.status !== 'draft')
        throw new BadRequestException(
          'BR13: Only draft GRNs can be confirmed.',
        );

      const [shipment] = await tx
        .select()
        .from(schema.importShipments)
        .where(eq(schema.importShipments.id, grn.shipmentId));

      // FR-09.3 Cost Basis Selection
      const isFinalised = shipment.isFinalised;
      const targetStatus = isFinalised ? 'confirmed' : 'flagged_for_adjustment';
      const usesEstimated = !isFinalised;

      await tx
        .update(schema.goodsReceipts)
        .set({
          status: targetStatus,
          usesEstimatedCost: usesEstimated,
          postedAt: new Date().toISOString(),
        })
        .where(eq(schema.goodsReceipts.id, grnId));

      const grnItems = await tx
        .select()
        .from(schema.goodsReceiptItems)
        .where(eq(schema.goodsReceiptItems.grnId, grnId));

      const shipmentItemIds = grnItems.map((i: any) => i.shipmentItemId);
      let shipmentItemMap = new Map();
      if (shipmentItemIds.length > 0) {
        const shipmentItems = await tx
          .select()
          .from(schema.shipmentItems)
          .where(inArray(schema.shipmentItems.id, shipmentItemIds));
        shipmentItemMap = new Map(shipmentItems.map((si: any) => [si.id, si]));
      }

      const claimsToInsert = [];
      const poLinesToUpdate = new Map();

      for (const item of grnItems) {
        // Handle rejection claims (BR13)
        const rejectedQty = new Decimal(String(item.rejectedQuantity));
        const si: any = shipmentItemMap.get(item.shipmentItemId);

        if (rejectedQty.greaterThan(0)) {
          let valueEtb = new Decimal(0);
          if (si) {
            const ciValue = new Decimal(String(si.ciValueEtb));
            const shippedQty = new Decimal(String(si.shippedQuantity));
            if (shippedQty.greaterThan(0)) {
              valueEtb = ciValue.dividedBy(shippedQty).times(rejectedQty);
            }
          }

          claimsToInsert.push({
            grnItemId: item.id,
            claimType: 'supplier_claim',
            quantity: rejectedQty.toString(),
            valueEtb: valueEtb.toFixed(4),
            status: 'open',
            notes: item.rejectionReason,
          });
        }

        // Handle PO Line receipt quantity (BR06 preparation)
        const acceptedQty = new Decimal(String(item.acceptedQuantity));
        if (acceptedQty.greaterThan(0) && si) {
          const current = poLinesToUpdate.get(si.poLineId) || new Decimal(0);
          poLinesToUpdate.set(si.poLineId, current.plus(acceptedQty));
        }
      }

      if (claimsToInsert.length > 0) {
        await tx.insert(schema.rejectedGoodsClaims).values(claimsToInsert);
      }

      // Update PO Lines and PO Status
      const allPoLines = await tx
        .select()
        .from(schema.poLines)
        .where(eq(schema.poLines.poId, grn.poId));
      let allPoLinesFullyReceived = true;
      let anyPoLineReceived = false;

      for (const pl of allPoLines) {
        let currentRcv = new Decimal(String(pl.receivedQuantity || 0));
        const addedQty = poLinesToUpdate.get(pl.id);

        if (addedQty) {
          currentRcv = currentRcv.plus(addedQty);
          await tx
            .update(schema.poLines)
            .set({ receivedQuantity: currentRcv.toString() })
            .where(eq(schema.poLines.id, pl.id));
        }

        if (currentRcv.greaterThan(0)) {
          anyPoLineReceived = true;
        }

        if (currentRcv.lessThan(new Decimal(String(pl.quantity)))) {
          allPoLinesFullyReceived = false;
        }
      }

      const poStatus = allPoLinesFullyReceived
        ? 'fully_received'
        : anyPoLineReceived
          ? 'partially_received'
          : null;
      if (poStatus) {
        await tx
          .update(schema.importPurchaseOrders)
          .set({ status: poStatus })
          .where(eq(schema.importPurchaseOrders.id, grn.poId));
      }

      // Update Shipment Status
      const allShipmentItems = await tx
        .select()
        .from(schema.shipmentItems)
        .where(eq(schema.shipmentItems.shipmentId, grn.shipmentId));

      const allGrnItemsForShipmentRows = await tx
        .select()
        .from(schema.goodsReceiptItems)
        .innerJoin(
          schema.goodsReceipts,
          eq(schema.goodsReceiptItems.grnId, schema.goodsReceipts.id),
        )
        .where(
          and(
            eq(schema.goodsReceipts.shipmentId, grn.shipmentId),
            inArray(schema.goodsReceipts.status, [
              'confirmed',
              'flagged_for_adjustment',
            ]),
          ),
        );

      const acceptedByShipmentItem = new Map();
      for (const row of allGrnItemsForShipmentRows) {
        const gi = row.goods_receipt_items;
        const acc = new Decimal(String(gi.acceptedQuantity));
        const current =
          acceptedByShipmentItem.get(gi.shipmentItemId) || new Decimal(0);
        acceptedByShipmentItem.set(gi.shipmentItemId, current.plus(acc));
      }

      let allShipmentItemsFullyReceived = true;
      let anyShipmentItemReceived = false;

      for (const si of allShipmentItems) {
        const acc = acceptedByShipmentItem.get(si.id) || new Decimal(0);
        const shipped = new Decimal(String(si.shippedQuantity));

        if (acc.greaterThan(0)) {
          anyShipmentItemReceived = true;
        }
        if (acc.lessThan(shipped)) {
          allShipmentItemsFullyReceived = false;
        }
      }

      const shipmentStatus = allShipmentItemsFullyReceived
        ? 'received'
        : anyShipmentItemReceived
          ? 'partially_received'
          : null;
      if (shipmentStatus) {
        await tx
          .update(schema.importShipments)
          .set({ status: shipmentStatus })
          .where(eq(schema.importShipments.id, grn.shipmentId));
      }

      return {
        message: 'GRN confirmed successfully',
        claimsGenerated: claimsToInsert.length,
        grnId,
        shipmentId: grn.shipmentId,
      };
    });

    // Post-Transaction: Recompute Landed Cost Matrix based strictly on Accepted Quantity overrides (BR06)
    await this.landedCostService.computeDraft(result.shipmentId);

    // Apply the Landed Cost (FR-09.3)
    await this.db.transaction(async (tx2: any) => {
      const lcResults = await tx2
        .select()
        .from(schema.importLandedCostResults)
        .where(
          eq(schema.importLandedCostResults.shipmentId, result.shipmentId),
        );
      const lcMap = new Map(
        lcResults.map((lc: any) => [
          lc.shipmentItemId,
          lc.perUnitLandedCostEtb,
        ]),
      );

      const grnItems = await tx2
        .select()
        .from(schema.goodsReceiptItems)
        .where(eq(schema.goodsReceiptItems.grnId, grnId));

      for (const gi of grnItems) {
        const perUnit = new Decimal(String(lcMap.get(gi.shipmentItemId) || 0));
        const acceptedQty = new Decimal(String(gi.acceptedQuantity));
        const lineValue = perUnit.times(acceptedQty);

        await tx2
          .update(schema.goodsReceiptItems)
          .set({
            perUnitLandedCostEtb: perUnit.toFixed(6),
            lineValueEtb: lineValue.toFixed(4),
          })
          .where(eq(schema.goodsReceiptItems.id, gi.id));
      }

      const [grn] = await tx2
        .select()
        .from(schema.goodsReceipts)
        .where(eq(schema.goodsReceipts.id, grnId));

      // FR-09.3 Notification
      if (grn.usesEstimatedCost) {
        const financeManagers = await tx2
          .select()
          .from(schema.users)
          .where(eq(schema.users.role, 'finance_manager'));

        const notifications = financeManagers.map((fm: any) => ({
          userId: fm.id,
          type: 'variance',
          channel: 'in_app',
          titleEn: 'GRN Flagged for Adjustment',
          bodyEn: `GRN ${grn.grnNumber} was posted using estimated landed costs. It is flagged for adjustment when final invoices arrive.`,
          entityType: 'goods_receipt',
          entityId: grnId,
        }));

        if (notifications.length > 0) {
          await tx2.insert(schema.notifications).values(notifications);
        }
      }
    });

    // SRS 7.1 ERP Inventory Posting Sync
    try {
      await this.inventoryPostingService.post(grnId);
      await this.financePostingService.postGrnJournal(grnId);
    } catch (erpError) {
      // Don't rollback GRN on ERP timeout/failure. Background retries handle it.
    }

    return result;
  }

  async getGrns() {
    return this.db.select().from(schema.goodsReceipts);
  }

  async getGrnById(id: string) {
    const [grn] = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.id, id));
    if (!grn) throw new NotFoundException('GRN not found');
    const items = await this.db
      .select()
      .from(schema.goodsReceiptItems)
      .where(eq(schema.goodsReceiptItems.grnId, id));
    return { grn, items };
  }

  async updateGrn(id: string, dto: any) {
    const [grn] = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.id, id));
    if (!grn) throw new NotFoundException('GRN not found');
    if (grn.status !== 'draft')
      throw new BadRequestException('Only draft GRNs can be updated');

    await this.db
      .update(schema.goodsReceipts)
      .set({
        warehouseLocation: dto.warehouseLocation,
        receiptDate: dto.receiptDate,
        inspectedBy: dto.inspectedBy,
      })
      .where(eq(schema.goodsReceipts.id, id));

    return this.getGrnById(id);
  }

  async postToErp(id: string) {
    const invRes = await this.inventoryPostingService.post(id);
    const finRes = await this.financePostingService.postGrnJournal(id);
    return { inventory: invRes, finance: finRes };
  }

  async retryPosting(id: string) {
    return this.postToErp(id);
  }

  async getDiscrepancies(id: string) {
    return this.quantityDiscrepancyService.analyzeAndStoreDiscrepancies(id);
  }

  async getClaims(grnId: string) {
    const grnItems = await this.db
      .select()
      .from(schema.goodsReceiptItems)
      .where(eq(schema.goodsReceiptItems.grnId, grnId));
    const itemIds = grnItems.map((i: any) => i.id);
    if (itemIds.length === 0) return [];
    return this.db
      .select()
      .from(schema.rejectedGoodsClaims)
      .where(inArray(schema.rejectedGoodsClaims.grnItemId, itemIds));
  }

  async updateClaim(claimId: string, dto: any) {
    const [updated] = await this.db
      .update(schema.rejectedGoodsClaims)
      .set({ status: dto.status, notes: dto.notes })
      .where(eq(schema.rejectedGoodsClaims.id, claimId))
      .returning();
    if (!updated) throw new NotFoundException('Claim not found');
    return updated;
  }
}
