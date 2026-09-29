import { Injectable, Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class LcAccountingListener {
  private readonly logger = new Logger(LcAccountingListener.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  @OnEvent('lc.charge.recorded')
  async handleLcChargeAccounting(payload: {
    lcId: string;
    chargeId: string;
    chargeType: string;
    amountEtb: string;
    issuingBank: string;
    createdBy: string;
  }) {
    this.logger.log(
      `Generating Journal Entry for LC Charge ${payload.chargeId}`,
    );

    await this.db.transaction(async (tx) => {
      const existingEntry = await tx.query.journalEntries.findFirst({
        where: and(
          eq(schema.journalEntries.sourceType, 'lc_charge'),
          eq(schema.journalEntries.sourceId, payload.chargeId),
        ),
      });

      if (existingEntry) {
        this.logger.log(
          `Journal Entry already exists for charge ${payload.chargeId}`,
        );
        return;
      }

      // 1. Insert Journal Entry (Debit Import Charges Expense, Credit Bank Account)
      const [journalEntry] = await tx
        .insert(schema.journalEntries)
        .values({
          sourceType: 'lc_charge' as const,
          sourceId: payload.chargeId,
          lines: [
            {
              account: 'Import Charges Expense',
              type: 'debit',
              amount: payload.amountEtb,
            },
            {
              account: 'Bank Account',
              type: 'credit',
              amount: payload.amountEtb,
            },
          ],
          posted: false,
        })
        .returning();

      // 2. Queue ERP Sync Log
      await tx.insert(schema.erpSyncLog).values({
        entityType: 'journal_entry' as const,
        entityId: journalEntry.id,
        payload: {
          ...journalEntry,
          description: `Bank charge (${payload.chargeType}) for LC ${payload.lcId}`,
        },
        status: 'pending' as const,
      });
    });
  }
}
