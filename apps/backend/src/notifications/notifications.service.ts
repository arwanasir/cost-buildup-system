import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { DRIZZLE, DrizzleDB } from '../db';
import * as schema from '../db/schema/schema';
import i18next from 'i18next';
import * as enTranslation from './templates/en.json';
import * as amTranslation from './templates/am.json';
import { EmailChannel } from './channels/email.channel';
import { TelegramChannel } from './channels/telegram.channel';
import { and, eq, inArray, asc, desc, count } from 'drizzle-orm';

type NotificationType =
  | 'lc_expiry'
  | 'lc_last_shipment'
  | 'lc_presentation'
  | 'variance'
  | 'approval_request'
  | 'posting_failed'
  | 'price_variance'
  | 'flagged_for_adjustment';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly emailChannel: EmailChannel,
    private readonly telegramChannel: TelegramChannel,
  ) {}

  async onModuleInit() {
    await i18next.init({
      fallbackLng: 'en',
      resources: {
        en: { translation: enTranslation },
        am: { translation: amTranslation },
      },
      interpolation: {
        escapeValue: false, // not needed for our backend templates
      },
    });
  }

  async notifyRoles(
    type: NotificationType,
    entity: { type: string; id: string },
    params: Record<string, any>,
  ) {
    try {
      const roleMap: Record<NotificationType, string[]> = {
        lc_expiry: ['procurement_manager', 'finance_manager'],
        lc_last_shipment: ['procurement_manager'],
        lc_presentation: ['procurement_manager', 'finance_manager'],
        variance: ['finance_manager'],
        approval_request: ['general_manager', 'finance_manager'],
        posting_failed: ['system_admin'],
        price_variance: ['finance_manager'],
        flagged_for_adjustment: ['finance_manager', 'system_admin'],
      };

      const targetRoles = roleMap[type];
      if (!targetRoles || targetRoles.length === 0) return;

      const activeUsers = await this.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.isActive, true),
            inArray(schema.users.role, targetRoles as any[]),
          ),
        );

      const userIds = activeUsers.map((u) => u.id);
      if (userIds.length > 0) {
        await this.create(userIds, type, entity, params);
      }
    } catch (error) {
      this.logger.error(
        `Failed to resolve roles for notification type ${type}`,
        error,
      );
    }
  }

  async create(
    userIds: string[],
    type: NotificationType,
    entity: { type: string; id: string },
    params: Record<string, any>,
  ) {
    if (!userIds || userIds.length === 0) return;

    try {
      const titleEn = i18next.t(`${type}_title`, { ...params, lng: 'en' });
      const titleAm = i18next.t(`${type}_title`, { ...params, lng: 'am' });
      const bodyEn = i18next.t(`${type}_body`, { ...params, lng: 'en' });
      const bodyAm = i18next.t(`${type}_body`, { ...params, lng: 'am' });

      const records = userIds.map((userId) => ({
        userId,
        type,
        channel: 'in_app' as const,
        titleEn,
        titleAm,
        bodyEn,
        bodyAm,
        entityType: entity.type,
        entityId: entity.id,
        isRead: false,
      }));

      await this.db.insert(schema.notifications).values(records);

      // Fan out to external channels
      await this.emailChannel.send(userIds, type, params);
      await this.telegramChannel.send(userIds, type, params);
    } catch (error) {
      this.logger.error(
        `Failed to create notifications for type ${type}`,
        error,
      );
    }
  }

  async findAllForUser(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(
          asc(schema.notifications.isRead),
          desc(schema.notifications.createdAt),
        )
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId)),
    ]);

    return {
      data,
      meta: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );
    return { count: result.count };
  }

  async markAsRead(id: string, userId: string) {
    const [updated] = await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning();
    return updated;
  }

  async markAllAsRead(userId: string) {
    const updated = await this.db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      )
      .returning();
    return { updated: updated.length };
  }
}
