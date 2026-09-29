import { Module } from '@nestjs/common';
import { CommercialInvoicesController } from './commercial-invoices.controller';
import { CommercialInvoicesService } from './commercial-invoices.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CommercialInvoicesController],
  providers: [CommercialInvoicesService],
})
export class CommercialInvoicesModule {}
