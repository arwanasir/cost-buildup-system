import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramChannel {
  private readonly logger = new Logger(TelegramChannel.name);
  private readonly botToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
  }

  async send(userIds: string[], type: string, params: Record<string, any>) {
    if (!this.botToken) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN is unset. Stubbing telegram notification for type: ${type}`,
      );
      return;
    }

    // Logic for sending telegram message would go here
    this.logger.log(
      `[STUB] Telegram message sent to ${userIds.length} users for type ${type}`,
    );
  }
}
