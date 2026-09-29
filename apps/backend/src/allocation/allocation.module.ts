import { Module } from '@nestjs/common';
import { AllocationService } from './allocation.service';
import { AllocationBasisService } from './allocation-basis.service';

@Module({
  providers: [AllocationService, AllocationBasisService],
  exports: [AllocationService, AllocationBasisService],
})
export class AllocationModule {}
