import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE, DrizzleDB } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class LcChargeSyncListener {
  private readonly logger = new Logger(LcChargeSyncListener.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Handles the 'lc.charge.recorded' event.
   *
   * When a bank charge is recorded against an LC, this listener splits the
   * charge evenly across all shipments already linked to that LC and creates
   * a cost register entry for each split portion.
   *
   * The charge's `registerEntryId` is set to the first inserted entry's ID so
   * that subsequent retries of this event do not double-sync the same charge.
   */
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
      // FIX: Category code was 'bank_charge' (lowercase, singular).
      // The seed creates 'BANK_CHARGES' (uppercase, plural). This mismatch
      // caused the lookup to always return undefined, silently aborting the
      // sync and leaving LC charges never recorded in the cost register.
      const category = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'BANK_CHARGES'),
      });

      if (!category) {
        this.logger.error(
          'Cost category "BANK_CHARGES" not found in the database. ' +
            'Ensure the reference seed has been run. Cannot sync LC charge.',
        );
        return;
      }

      const shipments = await tx.query.importShipments.findMany({
        where: eq(schema.importShipments.lcId, payload.lcId),
      });

      if (shipments.length === 0) {
        this.logger.log(
          `No shipments linked to LC ${payload.lcId}. Skipping cost sync for charge ${payload.chargeId}.`,
        );
        return;
      }

      // Split the charge amount evenly across all linked shipments,
      // rounded to 4 decimal places for precision.
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
        // Link the first inserted cost entry back to the charge record.
        // This acts as an idempotency marker — future event replays will see
        // registerEntryId is set and skip re-insertion.
        await tx
          .update(schema.lcBankCharges)
          .set({ registerEntryId: insertedEntries[0].id })
          .where(eq(schema.lcBankCharges.id, payload.chargeId));

        this.logger.log(
          `Successfully synced LC charge ${payload.chargeId} to ${insertedEntries.length} shipment cost entries.`,
        );
      }
    });
  }

  /**
   * Handles the 'shipment.created' event.
   *
   * When a new shipment is created for an LC that already has recorded bank
   * charges, those unsynced charges (registerEntryId IS NULL) are retroactively
   * synced to the new shipment so it inherits its fair share of LC costs.
   */
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
      // Only process charges that have not yet been synced to any cost entry.
      const unsyncedCharges = await tx.query.lcBankCharges.findMany({
        where: and(
          eq(schema.lcBankCharges.lcId, lcId),
          isNull(schema.lcBankCharges.registerEntryId),
        ),
      });

      if (unsyncedCharges.length === 0) {
        return;
      }

      // FIX: Same code mismatch as above — must be 'BANK_CHARGES'.
      const category = await tx.query.costCategories.findFirst({
        where: eq(schema.costCategories.code, 'BANK_CHARGES'),
      });

      const lc = await tx.query.lettersOfCredit.findFirst({
        where: eq(schema.lettersOfCredit.id, lcId),
      });

      if (!category || !lc) {
        this.logger.error(
          `Missing BANK_CHARGES category (found: ${!!category}) or LC record (found: ${!!lc}). ` +
            `Aborting retroactive sync of ${unsyncedCharges.length} unsynced charge(s) for LC ${lcId}.`,
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

        this.logger.log(
          `Retroactively synced charge ${charge.id} to new shipment ${payload.shipmentId}.`,
        );
      }
    });
  }
}
