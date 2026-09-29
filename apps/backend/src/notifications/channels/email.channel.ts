import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE, DrizzleDB } from '../../db';
import * as schema from '../../db/schema/schema';
import { inArray } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import i18next from 'i18next';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {
    const host = this.configService.get<string>('SMTP_HOST') || '127.0.0.1';
    const port = this.configService.get<number>('SMTP_PORT') || 1025;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      ignoreTLS: true,
    });
  }

  async send(userIds: string[], type: string, params: Record<string, any>) {
    if (!userIds || userIds.length === 0) return;

    try {
      const targetUsers = await this.db
        .select({
          email: schema.users.email,
          preferredLanguage: schema.users.preferredLanguage,
        })
        .from(schema.users)
        .where(inArray(schema.users.id, userIds));

      for (const user of targetUsers) {
        const lang = user.preferredLanguage || 'en';
        const subject = i18next.t(`${type}_title`, { ...params, lng: lang });
        const text = i18next.t(`${type}_body`, { ...params, lng: lang });

        await this.transporter.sendMail({
          from: '"Cost Buildup System" <noreply@company.com>',
          to: user.email,
          subject,
          text,
        });

        this.logger.log(`Sent email to ${user.email} in ${lang}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email notifications for type ${type}`,
        error,
      );
    }
  }
}
