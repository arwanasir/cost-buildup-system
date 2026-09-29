import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { FinancePostingService } from './finance-posting.service';
import { InventoryPostingService } from './inventory-posting.service';

@Injectable()
export class SyncDispatcher {
  private readonly logger = new Logger(SyncDispatcher.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly financePostingService: FinancePostingService,
    private readonly inventoryPostingService: InventoryPostingService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatch() {
    this.logger.log('Running SyncDispatcher check for pending ERP logs...');
    const pendingLogs = await this.db
      .select()
      .from(schema.erpSyncLog)
      .where(eq(schema.erpSyncLog.status, 'pending'));

    if (pendingLogs.length === 0) {
      return;
    }

    const now = Date.now();

    for (const log of pendingLogs) {
      if (log.attempts >= 3) {
        // Should have been marked failed, but safeguard
        await this.db
          .update(schema.erpSyncLog)
          .set({ status: 'failed' })
          .where(eq(schema.erpSyncLog.id, log.id));
        continue;
      }

      // Exponential backoff: 1 min, 2 min, 4 min based on attempts
      if (log.sentAt) {
        const sentAtMs = new Date(log.sentAt).getTime();
        const delayMs = Math.pow(2, log.attempts) * 60 * 1000;
        if (now - sentAtMs < delayMs) {
          continue; // Not ready yet
        }
      }

      this.logger.log(
        'Dispatching retry for sync log ${log.id} (Attempt ${log.attempts + 1})',
      );

      try {
        if (log.entityType === 'inventory_posting') {
          await this.inventoryPostingService.post(log.entityId, log.id);
        } else if (log.entityType === 'journal_entry') {
          const payload = log.payload;
          // The source_id is the grnId. Our postGrnJournal uses grnId.
          await this.financePostingService.postGrnJournal(
            payload.source_id,
            log.id,
          );
        }
      } catch (error) {
        // Services handle their own try/catch and decrementing logic safely now.
      }
    }
  }
}
