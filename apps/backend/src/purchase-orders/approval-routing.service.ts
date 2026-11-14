import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
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

    const poValueEtb = new Decimal(po.totalValueEtb);

    // Fetch thresholds
    const t1Record = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, 'po_approval_threshold_1'),
    });
    const t2Record = await this.db.query.policySettings.findFirst({
      where: eq(schema.policySettings.key, 'po_approval_threshold_2'),
    });

    const threshold1 = new Decimal(t1Record?.valueNumeric || '10000');
    const threshold2 = new Decimal(t2Record?.valueNumeric || '50000');

    if (poValueEtb.lt(threshold1)) {
      return 'finance_officer';
    } else if (poValueEtb.lte(threshold2)) {
      return 'finance_manager';
    } else {
      return 'general_manager';
    }
  }
}
