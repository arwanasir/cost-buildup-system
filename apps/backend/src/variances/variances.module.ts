import { Module } from '@nestjs/common';
import { VariancesService } from './variances.service';
import {
  VariancesController,
  ShipmentVariancesController,
} from './variances.controller';
import { DatabaseModule } from '@/db/db.module';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [VariancesController, ShipmentVariancesController],
  providers: [VariancesService, PermissionGuard, JwtAuthGuard],
  exports: [VariancesService],
})
export class VariancesModule {}
