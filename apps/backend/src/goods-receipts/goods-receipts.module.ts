import { Module } from '@nestjs/common';
import {
  GoodsReceiptsController,
  ClaimsController,
} from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuantityDiscrepancyService } from './quantity-discrepancy.service';
import { LandedCostModule } from '@/landed-cost/landed-cost.module';
import { ErpSyncModule } from '@/erp-sync/erp-sync.module';

@Module({
  imports: [LandedCostModule, ErpSyncModule],
  controllers: [GoodsReceiptsController, ClaimsController],
  providers: [GoodsReceiptsService, QuantityDiscrepancyService],
  exports: [GoodsReceiptsService, QuantityDiscrepancyService],
})
export class GoodsReceiptsModule {}
