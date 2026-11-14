import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { VariancesService } from './variances.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Audited('costVariances')
@ApiTags('Variances')
@ApiBearerAuth()
@Controller('variances')
@RequiredPermission(Permission.VARIANCE_READ)
export class VariancesController {
  constructor(private readonly variancesService: VariancesService) {}

  @Get()
  async getVariances(
    @Query('status') status?: string,
    @Query('shipment_id') shipmentId?: string,
  ) {
    return this.variancesService.findAll({ status, shipmentId });
  }

  @Post(':id/approve')
  @RequiredPermission(Permission.VARIANCE_APPROVE)
  async approveVariance(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    return this.variancesService.approve(id, req.user, comment);
  }

  @Post(':id/reject')
  @RequiredPermission(Permission.VARIANCE_APPROVE)
  async rejectVariance(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    return this.variancesService.reject(id, req.user, comment);
  }
}

@UseGuards(JwtAuthGuard, PermissionGuard)
@Audited('costVariances')
@Controller('shipments/:id/variances')
@RequiredPermission(Permission.VARIANCE_READ)
export class ShipmentVariancesController {
  constructor(private readonly variancesService: VariancesService) {}

  @Get()
  async getShipmentVariances(@Param('id') shipmentId: string) {
    return this.variancesService.findByShipment(shipmentId);
  }

  @Post('evaluate')
  @RequiredPermission(Permission.COST_WRITE)
  async evaluateShipmentVariances(@Param('id') shipmentId: string) {
    return this.variancesService.evaluate(shipmentId);
  }
}
