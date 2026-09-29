import { Module } from '@nestjs/common';
import { LandedCostModule } from '../landed-cost/landed-cost.module';
import { CostRegisterModule } from '../cost-register/cost-register.module';
import { AllocationModule } from '../allocation/allocation.module';
import { ImportShipmentsController } from './import-shipments.controller';
import { ImportShipmentsService } from './import-shipments.service';
import { ShipmentQuantityService } from './shipment-quantity.service';
import { ShipmentStatusService } from './shipment-status.service';
import { DocumentsService } from './documents.service';

@Module({
  imports: [LandedCostModule, CostRegisterModule, AllocationModule],
  controllers: [ImportShipmentsController],
  providers: [
    ImportShipmentsService,
    ShipmentQuantityService,
    ShipmentStatusService,
    DocumentsService,
  ],
})
export class ImportShipmentsModule {}
