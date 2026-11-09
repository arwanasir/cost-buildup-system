import { Module } from '@nestjs/common';
import {
  GoodsReceiptsController,
  ClaimsController,
} from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { QuantityDiscrepancyService } from './quantity-discrepancy.service';
import { LandedCostModule } from '@/landed-cost/landed-cost.module';
import { ErpSyncModule } from '@/erp-sync/erp-sync.module';
import { NumberingModule } from '@/core/numbering/numbering.module';

@Module({
  imports: [LandedCostModule, ErpSyncModule, NumberingModule],
  controllers: [GoodsReceiptsController, ClaimsController],
  providers: [GoodsReceiptsService, QuantityDiscrepancyService],
  exports: [GoodsReceiptsService, QuantityDiscrepancyService],
})
export class GoodsReceiptsModule {}
