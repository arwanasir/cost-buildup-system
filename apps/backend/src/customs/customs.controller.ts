import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import { CreateReleaseDto } from './dto/create-release.dto';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CustomsService } from './customs.service';
import { DutyPaymentsService } from './duty-payments.service';
import { CreateDutyPaymentDto } from './dto/create-duty-payment.dto';
import { UpdateDeclarationItemDto } from './dto/update-declaration-item.dto';
import { CreateDeclarationDto } from './dto/create-declaration.dto';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';

@Audited('customsDeclarations')
@ApiTags('Customs')
@ApiBearerAuth()
@Controller('customs')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class CustomsController {
  constructor(
    private readonly customsService: CustomsService,
    private readonly dutyPaymentsService: DutyPaymentsService,
  ) {}

  @Post()
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async createDeclaration(@Body() dto: CreateDeclarationDto, @Req() req: any) {
    return this.customsService.createDeclaration(
      dto.shipmentId,
      dto,
      req.user.id,
    );
  }

  @Post(':id/assess')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async assessDeclaration(@Param('id') declarationId: string, @Req() req: any) {
    return this.customsService.assessDeclaration(declarationId, req.user.id);
  }

  @Post(':id/payments')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async recordPayment(
    @Param('id') declarationId: string,
    @Body() dto: CreateDutyPaymentDto,
    @Req() req: any,
  ) {
    return this.dutyPaymentsService.record(declarationId, dto, req.user.id);
  }

  @Post(':id/release')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async releaseDeclaration(
    @Param('id') declarationId: string,
    @Body() dto: CreateReleaseDto,
    @Req() req: any,
  ) {
    return this.customsService.releaseDeclaration(
      declarationId,
      dto,
      req.user.id,
    );
  }

  @Get()
  @RequiredPermission(Permission.SHIPMENT_READ)
  async findAll() {
    return this.customsService.findAll();
  }

  @Get('tariff/:hsCode')
  @RequiredPermission(Permission.SHIPMENT_READ)
  async getTariffByHsCode(@Param('hsCode') hsCode: string) {
    return this.customsService.getTariffByHsCode(hsCode);
  }

  @Get(':id')
  @RequiredPermission(Permission.SHIPMENT_READ)
  async findOne(@Param('id') id: string) {
    return this.customsService.findOne(id);
  }

  @Patch(':id/items/:itemId')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async overrideItemRate(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateDeclarationItemDto,
    @Req() req: any,
  ) {
    return this.customsService.overrideItemRate(id, itemId, dto, req.user.id);
  }

  @Get(':id/payments')
  @RequiredPermission(Permission.SHIPMENT_READ)
  async getPayments(@Param('id') id: string) {
    return this.customsService.getPayments(id);
  }
}
