import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailChannel } from './channels/email.channel';
import { TelegramChannel } from './channels/telegram.channel';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailChannel, TelegramChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
