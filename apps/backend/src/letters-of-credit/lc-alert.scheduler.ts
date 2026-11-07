import { NotificationsService } from '../notifications/notifications.service';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DRIZZLE, DrizzleDB } from '@/db/db.token';
import * as schema from '@/db/schema';
import { eq, or, and, sql } from 'drizzle-orm';

function formatYMD(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

@Injectable()
export class LcAlertScheduler {
  private readonly logger = new Logger(LcAlertScheduler.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async checkLcAlerts() {
    this.logger.log('Starting LC Alert Scheduler checks...');

    const today = new Date();
    const expiry30 = formatYMD(addDays(today, 30));
    const expiry7 = formatYMD(addDays(today, 7));
    const shipment14 = formatYMD(addDays(today, 14));
    const shipment3 = formatYMD(addDays(today, 3));

    // 1. LC Expiry Alerts
    const lcsForExpiry = await this.db
      .select()
      .from(schema.lettersOfCredit)
      .where(
        or(
          eq(schema.lettersOfCredit.expiryDate, expiry30),
          eq(schema.lettersOfCredit.expiryDate, expiry7),
        ),
      );

    const shippedStatuses = [
      'shipped',
      'partially_received',
      'fully_received',
      'closed',
    ];

    for (const lc of lcsForExpiry) {
      const pos = await this.db
        .select()
        .from(schema.importPurchaseOrders)
        .where(eq(schema.importPurchaseOrders.lcId, lc.id));

      const notShipped = pos.some((po) => !shippedStatuses.includes(po.status));
      if (notShipped) {
        const days = lc.expiryDate === expiry30 ? 30 : 7;
        await this.notificationsService.notifyRoles(
          'lc_expiry',
          { type: 'letter_of_credit', id: lc.id },
          { lcNumber: lc.lcNumber, expiryDate: lc.expiryDate, days },
        );
        this.logger.log(`Created lc_expiry notification for LC ${lc.id}`);
      }
    }

    // 2. LC Last Shipment Date Alerts
    const lcsForShipment = await this.db
      .select()
      .from(schema.lettersOfCredit)
      .where(
        or(
          eq(schema.lettersOfCredit.lastShipmentDate, shipment14),
          eq(schema.lettersOfCredit.lastShipmentDate, shipment3),
        ),
      );

    for (const lc of lcsForShipment) {
      const days = lc.lastShipmentDate === shipment14 ? 14 : 3;
      await this.notificationsService.notifyRoles(
        'lc_last_shipment',
        { type: 'letter_of_credit', id: lc.id },
        { lcNumber: lc.lcNumber, lastShipmentDate: lc.lastShipmentDate, days },
      );
      this.logger.log(`Created lc_last_shipment notification for LC ${lc.id}`);
    }

    // 3. LC Presentation Alerts (docs_received)
    const lcsDocsReceived = await this.db
      .select()
      .from(schema.lettersOfCredit)
      .where(eq(schema.lettersOfCredit.status, 'docs_received'));

    for (const lc of lcsDocsReceived) {
      // Prevent duplicate notification on the same day
      const recentNote = await this.db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.entityId, lc.id),
          eq(schema.notifications.type, 'lc_presentation'),
          sql`DATE(${schema.notifications.createdAt}) = CURRENT_DATE`,
        ),
      });

      if (!recentNote) {
        const presentationDate = addDays(
          new Date(lc.updatedAt || today),
          lc.presentationPeriodDays || 21,
        );
        await this.notificationsService.notifyRoles(
          'lc_presentation',
          { type: 'letter_of_credit', id: lc.id },
          {
            lcNumber: lc.lcNumber,
            presentationDate: formatYMD(presentationDate),
          },
        );
        this.logger.log(`Created lc_presentation notification for LC ${lc.id}`);
      }
    }

    this.logger.log('Finished LC Alert Scheduler checks.');
  }
}
