import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import i18next from 'i18next';

export interface TelegramRecipient {
  chatId: string | null | undefined;
  language?: string | null;
}

/** Sends user-targeted notifications through the Telegram Bot API. */
@Injectable()
export class TelegramChannel {
  private readonly logger = new Logger(TelegramChannel.name);
  private readonly botToken: string | undefined;
  private readonly apiBase: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
  }

  async send(
    recipients: TelegramRecipient[],
    type: string,
    params: Record<string, any>,
  ): Promise<void> {
    if (!this.botToken) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN is unset. Skipping Telegram notification for type: ${type}`,
      );
      return;
    }

    const configuredRecipients = (recipients || []).filter(
      (recipient): recipient is TelegramRecipient & { chatId: string } =>
        typeof recipient.chatId === 'string' &&
        /^-?\d+$/.test(recipient.chatId),
    );
    if (configuredRecipients.length === 0) {
      this.logger.debug(
        `No Telegram chat IDs configured for notification type: ${type}`,
      );
      return;
    }

    const results = await Promise.allSettled(
      configuredRecipients.map((recipient) =>
        this.sendMessage(
          recipient.chatId,
          this.formatMessage(type, params, recipient.language || 'en'),
        ),
      ),
    );

    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failures.length > 0) {
      this.logger.warn(
        `Telegram: ${failures.length}/${configuredRecipients.length} messages failed for type "${type}". ` +
          `Failures: ${failures.map((failure) => failure.reason).join('; ')}`,
      );
    } else {
      this.logger.log(
        `Telegram: Sent "${type}" notification to ${configuredRecipients.length} recipient(s).`,
      );
    }
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    const response = await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Telegram API error for chat ${chatId}: HTTP ${response.status} — ${errorBody}`,
      );
    }

    const json = (await response.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!json.ok) {
      throw new Error(
        `Telegram API returned ok=false for chat ${chatId}: ${json.description}`,
      );
    }
  }

  private formatMessage(
    type: string,
    params: Record<string, any>,
    language: string,
  ): string {
    const lang = language.toLowerCase().startsWith('am') ? 'am' : 'en';
    const title = i18next.t(`${type}_title`, { ...params, lng: lang });
    const body = i18next.t(`${type}_body`, { ...params, lng: lang });
    return `${title}\n${body}`;
  }
}
