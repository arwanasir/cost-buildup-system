import { Module } from '@nestjs/common';
import { ErpSyncController } from './erp-sync.controller';
import { SyncDispatcher } from './sync-dispatcher.service';
import { HttpModule } from '@nestjs/axios';
import { FinancePostingService } from './finance-posting.service';
import { InventoryPostingService } from './inventory-posting.service';
import { InventoryClient } from './clients/inventory.client';
import { FinanceClient } from './clients/finance.client';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    HttpModule.register({
      timeout: 10000,
    }),
  ],
  controllers: [ErpSyncController],
  providers: [
    FinancePostingService,
    InventoryPostingService,
    InventoryClient,
    FinanceClient,
    SyncDispatcher,
  ],
  exports: [FinancePostingService, InventoryPostingService],
})
export class ErpSyncModule {}
