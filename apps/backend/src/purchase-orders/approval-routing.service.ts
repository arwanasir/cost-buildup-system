import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Decimal from 'decimal.js';

@Injectable()
export class ApprovalRoutingService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async determineRequiredApproverRole(poId: string): Promise<string> {
    const po = await this.db.query.importPurchaseOrders.findFirst({
      where: eq(schema.importPurchaseOrders.id, poId),
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order ${poId} not found`);
    }

    let usdEquivalent = new Decimal(0);

    if (po.currency === 'USD') {
      usdEquivalent = new Decimal(po.totalValueForeign);
    } else {
      // Find latest USD rate to ETB
      const usdRateRecord = await this.db.query.nbeExchangeRates.findFirst({
        where: eq(schema.nbeExchangeRates.currency, 'USD'),
        orderBy: (rates, { desc }) => [desc(rates.rateDate)],
      });

      if (!usdRateRecord) {
        throw new NotFoundException(
          'USD exchange rate not configured. Cannot compute threshold routing.',
        );
      }

      usdEquivalent = new Decimal(po.totalValueEtb).dividedBy(
        usdRateRecord.rate,
      );
    }

    // Fetch thresholds
    const t1Record = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, 'po_approval_threshold_1'),
    });
    const t2Record = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, 'po_approval_threshold_2'),
    });

    const threshold1 = new Decimal(t1Record?.valueNumeric || '50000');
    const threshold2 = new Decimal(t2Record?.valueNumeric || '100000');

    if (usdEquivalent.lt(threshold1)) {
      return 'finance_officer';
    } else if (usdEquivalent.gte(threshold1) && usdEquivalent.lt(threshold2)) {
      return 'finance_manager';
    } else {
      return 'general_manager';
    }
  }
}
