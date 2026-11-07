import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends notifications via the Telegram Bot API.
 *
 * Required environment variable:
 *   TELEGRAM_BOT_TOKEN — the bot token issued by @BotFather
 *
 * Each userId in the payload is treated as a Telegram chat_id. To receive
 * messages, users must have started a conversation with the bot first.
 *
 * Rate limiting: the Telegram Bot API enforces a limit of 30 messages/second
 * to different chats and 1 message/second to the same chat. We fire sends
 * concurrently per invocation — for large user lists consider adding a queue.
 */
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
    userIds: string[],
    type: string,
    params: Record<string, any>,
  ): Promise<void> {
    if (!this.botToken) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN is unset. Skipping Telegram notification for type: ${type}`,
      );
      return;
    }

    if (!userIds || userIds.length === 0) {
      this.logger.debug(`No Telegram recipients for notification type: ${type}`);
      return;
    }

    const text = this.formatMessage(type, params);

    // Fire sends concurrently — Telegram allows up to 30 msg/s across chats.
    const results = await Promise.allSettled(
      userIds.map((chatId) => this.sendMessage(chatId, text)),
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `Telegram: ${failures.length}/${userIds.length} messages failed for type "${type}". ` +
          `Failures: ${failures.map((f) => (f as PromiseRejectedResult).reason).join('; ')}`,
      );
    } else {
      this.logger.log(
        `Telegram: Sent "${type}" notification to ${userIds.length} recipient(s).`,
      );
    }
  }

  /**
   * Sends a single Telegram message to a chat_id via the Bot API.
   * Uses MarkdownV2 parse mode so bold/code formatting renders correctly.
   */
  private async sendMessage(chatId: string, text: string): Promise<void> {
    const url = `${this.apiBase}/sendMessage`;

    const body = JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Telegram API error for chat ${chatId}: HTTP ${response.status} — ${errorBody}`,
      );
    }

    const json = (await response.json()) as { ok: boolean; description?: string };
    if (!json.ok) {
      throw new Error(
        `Telegram API returned ok=false for chat ${chatId}: ${json.description}`,
      );
    }
  }

  /**
   * Formats a notification event into a human-readable Telegram message.
   * Uses MarkdownV2 escaping for special characters.
   *
   * Extend this method to add more notification types with richer templates.
   */
  private formatMessage(type: string, params: Record<string, any>): string {
    // MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
    const esc = (s: string) =>
      String(s).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

    switch (type) {
      case 'po_approved':
        return (
          `✅ *PO Approved*\n` +
          `PO Number: \`${esc(params.poNumber ?? 'N/A')}\`\n` +
          `Approved by: ${esc(params.approvedBy ?? 'N/A')}\n` +
          `Amount: ETB ${esc(String(params.amount ?? '0'))}`
        );

      case 'po_rejected':
        return (
          `❌ *PO Rejected*\n` +
          `PO Number: \`${esc(params.poNumber ?? 'N/A')}\`\n` +
          `Rejected by: ${esc(params.rejectedBy ?? 'N/A')}\n` +
          `Reason: ${esc(params.reason ?? 'No reason given')}`
        );

      case 'lc_expiry_alert':
        return (
          `⚠️ *LC Expiry Alert*\n` +
          `LC Number: \`${esc(params.lcNumber ?? 'N/A')}\`\n` +
          `Expires in: *${esc(String(params.daysToExpiry ?? '?'))} days*\n` +
          `Issuing Bank: ${esc(params.issuingBank ?? 'N/A')}`
        );

      case 'customs_released':
        return (
          `🚢 *Customs Released*\n` +
          `Shipment: \`${esc(params.shipmentNumber ?? 'N/A')}\`\n` +
          `Release Ref: ${esc(params.releaseReference ?? 'N/A')}\n` +
          `Released on: ${esc(params.releaseDate ?? 'N/A')}`
        );

      case 'variance_detected':
        return (
          `📊 *Cost Variance Detected*\n` +
          `Shipment: \`${esc(params.shipmentNumber ?? 'N/A')}\`\n` +
          `Variance: *${esc(String(params.variancePct ?? '0'))}%*\n` +
          `Requires approval from Finance Manager`
        );

      case 'posting_failed':
        return (
          `🔴 *ERP Posting Failed*\n` +
          `Entity: ${esc(params.entityType ?? 'N/A')} \`${esc(params.entityId ?? 'N/A')}\`\n` +
          `Error: ${esc(params.error ?? 'Unknown error')}`
        );

      default:
        // Generic fallback for any notification type not explicitly handled
        return (
          `🔔 *Notification: ${esc(type)}*\n` +
          Object.entries(params)
            .map(([k, v]) => `${esc(k)}: ${esc(String(v))}`)
            .join('\n')
        );
    }
  }
}
