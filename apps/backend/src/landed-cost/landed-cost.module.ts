import { AllocationModule } from '../allocation/allocation.module';
import { Module } from '@nestjs/common';
import { LandedCostService } from './landed-cost.service';
import { FinalisationGuardService } from './finalisation-guard.service';

@Module({
  imports: [AllocationModule],
  providers: [LandedCostService, FinalisationGuardService],
  exports: [LandedCostService, FinalisationGuardService],
})
export class LandedCostModule {}
