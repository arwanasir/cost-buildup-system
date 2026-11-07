import { Injectable, Inject } from '@nestjs/common';
import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/db/db.token';
import * as schema from '@/db/schema';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const through30Days = new Date();
    through30Days.setUTCDate(through30Days.getUTCDate() + 30);
    const lastDay = through30Days.toISOString().slice(0, 10);

    const [pendingPos] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.importPurchaseOrders)
      .where(eq(schema.importPurchaseOrders.status, 'pending_approval'));

    const [expiringLcs] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.lettersOfCredit)
      .where(
        and(
          ne(schema.lettersOfCredit.status, 'settled'),
          gte(schema.lettersOfCredit.expiryDate, today),
          lte(schema.lettersOfCredit.expiryDate, lastDay),
        ),
      );

    return {
      pendingPurchaseOrders: Number(pendingPos?.count ?? 0),
      expiringLettersOfCredit: Number(expiringLcs?.count ?? 0),
    };
  }
}
