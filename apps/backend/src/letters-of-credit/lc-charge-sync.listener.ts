import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class LcChargeSyncListener {
  private readonly logger = new Logger(LcChargeSyncListener.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  @OnEvent('lc.charge.recorded')
  async handleLcChargeRecordedEvent(payload: {
    lcId: string;
    chargeId: string;
    chargeType: string;
    amountEtb: string;
    issuingBank: string;
    createdBy: string;
  }) {
    this.logger.log(
      `Handling lc.charge.recorded event for charge ${payload.chargeId}`,
    );

    await this.db.transaction(async (tx) => {
      const category = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'bank_charge'),
      });

      if (!category) {
        this.logger.error(
          'Cost category "bank_charge" not found. Cannot sync LC charge.',
        );
        return;
      }

      const shipments = await tx.query.importShipments.findMany({
        where: eq(schema.importShipments.lcId, payload.lcId),
      });

      if (shipments.length === 0) {
        this.logger.log(
          `No shipments linked to LC ${payload.lcId}. Skipping cost sync.`,
        );
        return;
      }

      const splitAmount = new Decimal(payload.amountEtb)
        .div(shipments.length)
        .toDecimalPlaces(4)
        .toString();

      const costEntriesToInsert = shipments.map((shipment) => ({
        shipmentId: shipment.id,
        costCategoryId: category.id,
        costSubcategory: payload.chargeType,
        providerName: payload.issuingBank,
        amountEtb: splitAmount,
        allocationMethod: 'by_value' as const,
        isEstimated: false,
        source: 'lc_bank_charge' as const,
        sourceRefId: payload.chargeId,
        createdBy: payload.createdBy,
      }));

      const insertedEntries = await tx
        .insert(schema.importCostEntries)
        .values(costEntriesToInsert)
        .returning();

      if (insertedEntries.length > 0) {
        await tx
          .update(schema.lcBankCharges)
          .set({ registerEntryId: insertedEntries[0].id })
          .where(eq(schema.lcBankCharges.id, payload.chargeId));
      }
    });
  }
  @OnEvent('shipment.created')
  async handleShipmentCreatedEvent(payload: {
    shipmentId: string;
    lcId?: string;
    createdBy: string;
  }) {
    if (!payload.lcId) return;
    const lcId = payload.lcId;

    this.logger.log(
      `Handling shipment.created event for shipment ${payload.shipmentId} (LC: ${lcId})`,
    );

    await this.db.transaction(async (tx) => {
      const unsyncedCharges = await tx.query.lcBankCharges.findMany({
        where: and(
          eq(schema.lcBankCharges.lcId, lcId),
          isNull(schema.lcBankCharges.registerEntryId),
        ),
      });

      if (unsyncedCharges.length === 0) {
        return;
      }

      const category = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'bank_charge'),
      });

      const lc = await tx.query.lettersOfCredit.findFirst({
        where: eq(schema.lettersOfCredit.id, lcId),
      });

      if (!category || !lc) {
        this.logger.error(
          'Missing category or LC, aborting sync of unsynced charges.',
        );
        return;
      }

      for (const charge of unsyncedCharges) {
        const [inserted] = await tx
          .insert(schema.importCostEntries)
          .values({
            shipmentId: payload.shipmentId,
            costCategoryId: category.id,
            costSubcategory: charge.chargeType,
            providerName: lc.issuingBank,
            amountEtb: charge.amountEtb,
            allocationMethod: 'by_value' as const,
            isEstimated: false,
            source: 'lc_bank_charge' as const,
            sourceRefId: charge.id,
            createdBy: payload.createdBy,
          })
          .returning();

        await tx
          .update(schema.lcBankCharges)
          .set({ registerEntryId: inserted.id })
          .where(eq(schema.lcBankCharges.id, charge.id));
      }
    });
  }
}
