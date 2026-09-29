import { PoStatusService } from './po-status.service';
import { ApprovalRoutingService } from './approval-routing.service';
import { PoCalculationService } from './po-calculation.service';
import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PurchaseOrdersController],
  providers: [
    PurchaseOrdersService,
    PoCalculationService,
    ApprovalRoutingService,
    PoStatusService,
  ],
})
export class PurchaseOrdersModule {}
