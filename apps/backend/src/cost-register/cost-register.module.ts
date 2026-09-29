import { Module } from '@nestjs/common';
import { AllocationModule } from '@/allocation/allocation.module';
import { StorageModule } from '@/storage/storage.module';
import { CostEntriesService } from './cost-entries.service';
import { CostSummaryService } from './cost-summary.service';
import { FxToleranceService } from './fx-tolerance.service';
import { CostEntriesController } from './cost-entries.controller';

@Module({
  imports: [AllocationModule, StorageModule],
  controllers: [CostEntriesController],
  providers: [CostEntriesService, CostSummaryService, FxToleranceService],
  exports: [CostEntriesService, CostSummaryService, FxToleranceService],
})
export class CostRegisterModule {}
