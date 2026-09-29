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
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Audited('costVariances')
@ApiTags('Variances')
@ApiBearerAuth()
@Controller('variances')
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
  async approveVariance(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    return this.variancesService.approve(id, req.user, comment);
  }

  @Post(':id/reject')
  async rejectVariance(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Req() req: any,
  ) {
    return this.variancesService.reject(id, req.user, comment);
  }
}

@UseGuards(AuthGuard('jwt'))
@Audited('costVariances')
@Controller('shipments/:id/variances')
export class ShipmentVariancesController {
  constructor(private readonly variancesService: VariancesService) {}

  @Get()
  async getShipmentVariances(@Param('id') shipmentId: string) {
    return this.variancesService.findByShipment(shipmentId);
  }

  @Post('evaluate')
  async evaluateShipmentVariances(@Param('id') shipmentId: string) {
    return this.variancesService.evaluate(shipmentId);
  }
}
