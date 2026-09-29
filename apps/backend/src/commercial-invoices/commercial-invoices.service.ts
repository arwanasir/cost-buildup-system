import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { CreateCommercialInvoiceDto } from './dto/create-commercial-invoice.dto';

@Injectable()
export class CommercialInvoicesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(shipmentId: string, dto: CreateCommercialInvoiceDto) {
    return this.db.transaction(async (tx) => {
      const shipment = await tx.query.importShipments.findFirst({
        where: eq(schema.importShipments.id, shipmentId),
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment ${shipmentId} not found`);
      }

      const shipmentItems = await tx.query.shipmentItems.findMany({
        where: eq(schema.shipmentItems.shipmentId, shipmentId),
      });

      let totalForeign = new Decimal(0);
      let totalEtb = new Decimal(0);
      const shipmentItemUpdates = [];
      const costEntriesToInsert: any[] = [];

      // BR11: Fetch PO Lines to calculate PO expected total
      const poLineIds = shipmentItems.map((i: any) => i.poLineId);
      const poLines = await tx.query.poLines.findMany({
        where: inArray(schema.poLines.id, poLineIds),
      });
      const poLineMap = new Map(poLines.map((l) => [l.id, l]));

      let poTotalForeign = new Decimal(0);

      // Fetch cost category for FOB (Base supplier cost)
      const fobCat = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'FOB'),
      });

      for (const itemDto of dto.items) {
        const existingItem = shipmentItems.find(
          (i: any) => i.id === itemDto.shipmentItemId,
        );
        if (!existingItem)
          throw new NotFoundException(
            `Shipment item ${itemDto.shipmentItemId} not found`,
          );

        const poLine = poLineMap.get(existingItem.poLineId);
        if (!poLine)
          throw new NotFoundException(
            `PO Line not found for shipment item ${existingItem.id}`,
          );

        const qty = new Decimal(existingItem.shippedQuantity);
        const unitPrice = new Decimal(itemDto.ciUnitPrice);
        const fxRate = new Decimal(dto.fxRate);

        const ciValueForeign = qty.times(unitPrice).toDecimalPlaces(4);
        const ciValueEtb = ciValueForeign.times(fxRate).toDecimalPlaces(4);

        totalForeign = totalForeign.plus(ciValueForeign);
        totalEtb = totalEtb.plus(ciValueEtb);

        // Add to PO Expected total
        poTotalForeign = poTotalForeign.plus(
          qty.times(new Decimal(poLine.unitPrice)),
        );

        shipmentItemUpdates.push({
          id: existingItem.id,
          ciUnitPrice: unitPrice.toString(),
          ciValueForeign: ciValueForeign.toString(),
          ciValueEtb: ciValueEtb.toString(),
        });

        if (fobCat) {
          costEntriesToInsert.push({
            shipmentId,
            costCategoryId: fobCat.id,
            providerName: shipment.supplierId,
            isEstimated: false,
            isItemSpecific: true,
            shipmentItemId: existingItem.id,
            amountEtb: ciValueEtb.toString(),
            source: 'commercial_invoice' as any,
            allocationMethod: 'by_value' as any,
          });
        }
      }

      // BR11: Compute Price Variance Pct
      let variancePct = new Decimal(0);
      if (poTotalForeign.greaterThan(0)) {
        variancePct = totalForeign
          .minus(poTotalForeign)
          .dividedBy(poTotalForeign)
          .times(100);
      }

      const setting = await tx.query.policySettings.findFirst({
        where: eq(schema.policySettings.key, 'ci_price_variance_pct'),
      });
      const varianceThreshold = setting
        ? new Decimal(setting.valueNumeric || 10)
        : new Decimal(10);

      const isVarianceAboveThreshold =
        variancePct.greaterThan(varianceThreshold);
      let acknowledgedAt = null;
      if (!isVarianceAboveThreshold) {
        acknowledgedAt = new Date().toISOString(); // Auto-acknowledge if within bounds
      }

      // 1. Insert Commercial Invoice header
      const [ci] = await tx
        .insert(schema.commercialInvoices)
        .values({
          shipmentId,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate,
          currency: dto.currency,
          fxRate: dto.fxRate.toString(),
          totalForeign: totalForeign.toString(),
          totalEtb: totalEtb.toString(),
          priceVariancePct: variancePct.toDecimalPlaces(4).toString(),
          acknowledgedAt,
        })
        .returning();

      // BR11: Create Notification for Procurement Managers if blocked
      if (isVarianceAboveThreshold) {
        const procManagers = await tx.query.users.findMany({
          where: eq(schema.users.role, 'procurement_manager' as any),
        });
        const notificationsToInsert = procManagers.map((m) => ({
          userId: m.id,
          type: 'approval_request' as any,
          channel: 'in_app' as any,
          titleEn: `CI Price Variance Alert`,
          bodyEn: `Commercial Invoice ${dto.invoiceNumber} exceeds PO price by ${variancePct.toDecimalPlaces(2)}%. Acknowledgment required.`,
          entityType: 'commercial_invoices',
          entityId: ci.id,
        }));
        if (notificationsToInsert.length > 0) {
          await tx.insert(schema.notifications).values(notificationsToInsert);
        }
      }

      // 2. Update Shipment Items
      for (const update of shipmentItemUpdates) {
        await tx
          .update(schema.shipmentItems)
          .set({
            ciUnitPrice: update.ciUnitPrice,
            ciValueForeign: update.ciValueForeign,
            ciValueEtb: update.ciValueEtb,
          })
          .where(eq(schema.shipmentItems.id, update.id));
      }

      // 3. Replace FOB cost entries (supplier_cost)
      if (fobCat) {
        await tx
          .delete(schema.importCostEntries)
          .where(
            and(
              eq(schema.importCostEntries.shipmentId, shipmentId),
              eq(schema.importCostEntries.costCategoryId, fobCat.id),
            ),
          );
        await tx.insert(schema.importCostEntries).values(costEntriesToInsert);
      }

      return ci;
    });
  }

  async acknowledgeVariance(ciId: string, userId: string) {
    const [ci] = await this.db
      .update(schema.commercialInvoices)
      .set({
        acknowledgedAt: new Date().toISOString(),
        varianceAcknowledgedBy: userId,
      })
      .where(eq(schema.commercialInvoices.id, ciId))
      .returning();

    if (!ci) {
      throw new NotFoundException(`Commercial Invoice ${ciId} not found`);
    }
    return ci;
  }
}
