import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { CommercialInvoicesService } from './commercial-invoices.service';
import { CreateCommercialInvoiceDto } from './dto/create-commercial-invoice.dto';

@Audited('commercialInvoices')
@ApiTags('CommercialInvoices')
@ApiBearerAuth()
@Controller('import-shipments')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class CommercialInvoicesController {
  constructor(private readonly ciService: CommercialInvoicesService) {}

  @Post(':id/commercial-invoice')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async createCommercialInvoice(
    @Param('id') shipmentId: string,
    @Body() dto: CreateCommercialInvoiceDto,
  ) {
    return this.ciService.create(shipmentId, dto);
  }

  @Post(':id/acknowledge')
  @RequiredPermission(Permission.PO_APPROVE_TIER1) // Procurement manager level
  async acknowledgeVariance(@Param('id') ciId: string, @Req() req: any) {
    return this.ciService.acknowledgeVariance(ciId, req.user.id);
  }
}
