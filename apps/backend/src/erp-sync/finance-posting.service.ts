import { NotificationsService } from '../notifications/notifications.service';
import { FinanceClient } from './clients/finance.client';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class FinancePostingService {
  private readonly logger = new Logger(FinancePostingService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly notificationsService: NotificationsService,
    private readonly financeClient: FinanceClient,
  ) {}

  async postGrnJournal(grnId: string, existingLogId?: string) {
    const [grn] = await this.db
      .select()
      .from(schema.goodsReceipts)
      .where(eq(schema.goodsReceipts.id, grnId));
    if (!grn) throw new Error('GRN not found');

    const grnItems = await this.db
      .select()
      .from(schema.goodsReceiptItems)
      .where(eq(schema.goodsReceiptItems.grnId, grnId));
    if (grnItems.length === 0) return;

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

    let totalCI = new Decimal(0);
    let totalNonCI = new Decimal(0);
    let totalAmount = new Decimal(0);

    for (const item of grnItems) {
      const acceptedQty = new Decimal(String(item.acceptedQuantity));
      if (acceptedQty.isZero()) continue;

      const si: any = shipmentItemMap.get(item.shipmentItemId);
      const lc: any = lcMap.get(item.shipmentItemId);
      if (!si || !lc) continue;

      const shippedQty = new Decimal(String(si.shippedQuantity));
      if (shippedQty.isZero()) continue;

      const ratio = acceptedQty.dividedBy(shippedQty);
      const ciValue = new Decimal(String(lc.ciValueEtb)).times(ratio);
      const totalCost = new Decimal(String(lc.totalLandedCostEtb)).times(ratio);
      const nonCiValue = totalCost.minus(ciValue);

      totalCI = totalCI.plus(ciValue);
      totalNonCI = totalNonCI.plus(nonCiValue);
      totalAmount = totalAmount.plus(totalCost);
    }

    if (totalAmount.isZero()) return;

    const lines = [
      {
        account_code: '1000-INV', // Inventory Asset
        account_name: 'Inventory Asset',
        debit: totalAmount.toFixed(4),
        credit: '0.0000',
        currency: 'ETB',
      },
      {
        account_code: '2000-AP', // Accounts Payable
        account_name: 'Accounts Payable',
        debit: '0.0000',
        credit: totalCI.toFixed(4),
        currency: 'ETB',
      },
      {
        account_code: '2001-ACC', // Accrued Import Charges
        account_name: 'Accrued Import Charges',
        debit: '0.0000',
        credit: totalNonCI.toFixed(4),
        currency: 'ETB',
      },
    ];

    const [journalEntry] = await this.db
      .insert(schema.journalEntries)
      .values({
        sourceType: 'grn',
        sourceId: grnId,
        lines: lines,
        posted: false,
      })
      .returning();

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
          entityType: 'journal_entry',
          entityId: journalEntry.id,
          payload: {
            journal_id: journalEntry.id,
            source_type: 'grn',
            source_id: grnId,
            lines,
          },
          status: 'pending',
        })
        .returning();
      log = newLog;
    }

    try {
      this.logger.log(
        `Sending finance journal entry for GRN ${grn.grnNumber} to ERP...`,
      );

      const responseJson = await this.financeClient.postJournalEntry(
        journalEntry.id,
        grnId,
        lines,
      );

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

      await this.db
        .update(schema.journalEntries)
        .set({ posted: true })
        .where(eq(schema.journalEntries.id, journalEntry.id));

      return { status: 'success', response: responseJson };
    } catch (error: any) {
      this.logger.error(
        `Failed to sync finance journal for GRN ${grn.grnNumber} to ERP: ${error.message}`,
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

      throw error;
    }
  }
  @OnEvent('landedCost.finalised', { async: true })
  async handleLandedCostFinalised(payload: {
    shipmentId: string;
    actorId: string;
    timestamp: string;
  }) {
    try {
      this.logger.log(
        `Processing Landed Cost finalisation adjustments for shipment ${payload.shipmentId}`,
      );

      const flaggedGrns = await this.db
        .select()
        .from(schema.goodsReceipts)
        .where(
          and(
            eq(schema.goodsReceipts.shipmentId, payload.shipmentId),
            eq(schema.goodsReceipts.status, 'flagged_for_adjustment'),
          ),
        );

      if (flaggedGrns.length === 0) return;

      const lcResultsRows = await this.db
        .select()
        .from(schema.importLandedCostResults)
        .where(
          eq(schema.importLandedCostResults.shipmentId, payload.shipmentId),
        );
      const lcResultsMap = new Map(
        lcResultsRows.map((r: any) => [r.shipmentItemId, r]),
      );

      for (const grn of flaggedGrns) {
        let totalAdjustment = new Decimal(0);

        const grnItems = await this.db
          .select()
          .from(schema.goodsReceiptItems)
          .where(eq(schema.goodsReceiptItems.grnId, grn.id));

        for (const item of grnItems) {
          const lcResult: any = lcResultsMap.get(item.shipmentItemId);
          if (!lcResult) continue;

          const oldPerUnit = new Decimal(String(item.perUnitLandedCostEtb));
          const newPerUnit = new Decimal(String(lcResult.perUnitLandedCostEtb));

          if (!oldPerUnit.equals(newPerUnit)) {
            const diffPerUnit = newPerUnit.minus(oldPerUnit);
            const acceptedQty = new Decimal(String(item.acceptedQuantity));
            totalAdjustment = totalAdjustment.plus(
              diffPerUnit.times(acceptedQty),
            );
          }
        }

        if (totalAdjustment.isZero()) {
          // If no financial diff, just mark posted since no adjustment needed
          await this.db
            .update(schema.goodsReceipts)
            .set({ status: 'posted' })
            .where(eq(schema.goodsReceipts.id, grn.id));
          continue;
        }

        let debitCode, debitName, creditCode, creditName;
        if (totalAdjustment.greaterThan(0)) {
          // Final cost is higher -> Increase Inventory value
          debitCode = '1000-INV';
          debitName = 'Inventory Asset';
          creditCode = '2001-ACC';
          creditName = 'Accrued Import Charges';
        } else {
          // Final cost is lower -> Decrease Inventory value
          debitCode = '2001-ACC';
          debitName = 'Accrued Import Charges';
          creditCode = '1000-INV';
          creditName = 'Inventory Asset';
        }

        const absAdjustment = totalAdjustment.abs().toFixed(4);

        const lines = [
          {
            account_code: debitCode,
            account_name: debitName,
            debit: absAdjustment,
            credit: '0.0000',
            currency: 'ETB',
          },
          {
            account_code: creditCode,
            account_name: creditName,
            debit: '0.0000',
            credit: absAdjustment,
            currency: 'ETB',
          },
        ];

        const [journalEntry] = await this.db
          .insert(schema.journalEntries)
          .values({
            sourceType: 'grn',
            sourceId: grn.id,
            lines: lines,
            posted: false,
          })
          .returning();

        // FR-09.3 Queue for Finance Manager approval (approval_request notification)
        const financeManagers = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.role, 'finance_manager'));
        const notifications = financeManagers.map((fm: any) => ({
          userId: fm.id,
          type: 'approval_request',
          channel: 'in_app',
          titleEn: 'GRN Adjustment Journal Requires Approval',
          bodyEn: `GRN ${grn.grnNumber} finalised costs require a journal adjustment of ${absAdjustment} ETB. Please review Journal Entry ${journalEntry.id}.`,
          entityType: 'journal_entry',
          entityId: journalEntry.id,
        }));

        if (notifications.length > 0) {
          await this.db.insert(schema.notifications).values(notifications);
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error processing landed cost finalisation event: ${err.message}`,
      );
    }
  }
}
