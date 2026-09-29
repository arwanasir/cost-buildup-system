import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '@/db';
import { DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class LcStatusService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // FR-03.2 ordered transition map
  private readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    applied: ['opened'],
    opened: ['advised', 'amended'],
    advised: ['docs_submitted', 'amended'],
    amended: ['advised', 'docs_submitted'],
    docs_submitted: ['docs_received'],
    docs_received: ['docs_checked'],
    docs_checked: ['accepted', 'discrepancies_found'],
    discrepancies_found: ['accepted', 'docs_checked'], // docs_checked in case of re-check
    accepted: ['payment_authorised'],
    payment_authorised: ['settled'],
    settled: [],
  };

  async transition(lcId: string, newStatus: string, userId: string) {
    return this.db.transaction(async (tx) => {
      const lc = await tx.query.lettersOfCredit.findFirst({
        where: eq(schema.lettersOfCredit.id, lcId),
      });

      if (!lc) {
        throw new NotFoundException(`LC ${lcId} not found`);
      }

      // Check ordered transition map
      const allowedNext = this.ALLOWED_TRANSITIONS[lc.status] || [];
      if (!allowedNext.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid status transition from ${lc.status} to ${newStatus}. Allowed next states: ${allowedNext.join(', ')}`,
        );
      }

      // GM Approval Gate (SRS 2.3)
      if (newStatus === 'opened' && lc.status === 'applied') {
        const thresholdSetting = await tx.query.policySettings.findFirst({
          where: eq(schema.policySettings.key, 'lc_gm_threshold'),
        });

        if (thresholdSetting && thresholdSetting.valueNumeric) {
          const threshold = new Decimal(thresholdSetting.valueNumeric);
          const amountEtb = new Decimal(lc.amountEtb);

          if (amountEtb.greaterThan(threshold) && !lc.gmApprovedBy) {
            throw new BadRequestException(
              'GM Approval is required before opening this LC',
            );
          }
        }
      }

      const [updated] = await tx
        .update(schema.lettersOfCredit)
        .set({ status: newStatus as any, updatedBy: userId })
        .where(eq(schema.lettersOfCredit.id, lcId))
        .returning();

      return updated;
    });
  }
}
