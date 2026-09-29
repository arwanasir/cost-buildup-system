import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import { CreateShipmentChargeDto } from './dto/create-shipment-charge.dto';
import { CreateClearingInvoiceDto } from './dto/create-clearing-invoice.dto';
import { Query } from '@nestjs/common';
import { Permission } from '@/auth/permissions';
import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { ImmutabilityGuard } from '@/common/guards/immutability.guard';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';

import { ImportShipmentsService } from './import-shipments.service';
import { CostEntriesService } from '@/cost-register/cost-entries.service';
import { AllocationService } from '@/allocation/allocation.service';
import { LandedCostService } from '@/landed-cost/landed-cost.service';
import { FinalisationGuardService } from '@/landed-cost/finalisation-guard.service';
import { CostSummaryService } from '@/cost-register/cost-summary.service';
import { CreateCostEntryDto } from '@/cost-register/dto/create-cost-entry.dto';
import { ShipmentStatusService } from './shipment-status.service';
import { DocumentsService } from './documents.service';

import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Audited('importShipments')
@ApiTags('ImportShipments')
@ApiBearerAuth()
@Controller('import-shipments')
@UseGuards(AuthGuard('jwt'), PermissionGuard, ImmutabilityGuard)
export class ImportShipmentsController {
  constructor(
    private readonly shipmentsService: ImportShipmentsService,
    private readonly statusService: ShipmentStatusService,
    private readonly documentsService: DocumentsService,
    private readonly costEntriesService: CostEntriesService,
    private readonly costSummaryService: CostSummaryService,
    private readonly allocationService: AllocationService,
    private readonly landedCostService: LandedCostService,
    private readonly finalisationGuardService: FinalisationGuardService,
  ) {}

  @Post()
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async createShipment(@Body() createDto: CreateShipmentDto, @Req() req: any) {
    return this.shipmentsService.create(createDto, req.user.id);
  }

  @Post(':id/documents')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadShipmentDocument(
    @Param('id') shipmentId: string,
    @Body('documentType') documentType: string,
    @Body('referenceNumber') referenceNumber: string,
    @Body('documentDate') documentDate: string,
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(application\/pdf|image\/jpeg|image\/png)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!documentType) {
      throw new Error('documentType is required in the body');
    }
    return this.documentsService.uploadDocument(
      shipmentId,
      file,
      documentType,
      referenceNumber,
      documentDate,
      req.user.id,
    );
  }

  @Get(':id/documents')
  async getShipmentDocuments(@Param('id') shipmentId: string) {
    return this.documentsService.getDocuments(shipmentId);
  }
  @Get(':id/document-checklist')
  async getDocumentChecklist(@Param('id') shipmentId: string) {
    return this.documentsService.getDocumentChecklist(shipmentId);
  }

  @Delete(':id/documents/:docId')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async deleteShipmentDocument(
    @Param('id') shipmentId: string,
    @Param('docId') docId: string,
  ) {
    return this.documentsService.deleteDocument(shipmentId, docId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Post(':id/status')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentStatusDto,
    @Req() req: any,
  ) {
    return this.statusService.updateStatus(id, dto, req.user.id);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('poId') poId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('etaStart') etaStart?: string,
    @Query('etaEnd') etaEnd?: string,
  ) {
    return this.shipmentsService.findAll({
      status,
      poId,
      supplierId,
      etaStart,
      etaEnd,
    });
  }

  @Patch(':id')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async updateShipment(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.update(id, dto);
  }

  @Get(':id/items')
  async getItems(@Param('id') id: string) {
    return this.shipmentsService.getItems(id);
  }

  @Get(':id/quantity-check')
  async getQuantityCheck(@Param('id') id: string) {
    return this.shipmentsService.getQuantityCheck(id);
  }

  @Post(':id/clearing-agent-invoice')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async addClearingAgentInvoice(
    @Param('id') id: string,
    @Body() dto: CreateClearingInvoiceDto,
    @Req() req: any,
  ) {
    return this.shipmentsService.addClearingAgentInvoice(id, dto, req.user.id);
  }

  @Post(':id/port-charges')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async addPortCharges(
    @Param('id') id: string,
    @Body() dto: CreateShipmentChargeDto,
    @Req() req: any,
  ) {
    return this.shipmentsService.addCharge(
      id,
      ['PORT_HANDLING', 'PORT'],
      'Port Handling Charge',
      dto,
      req.user.id,
    );
  }

  @Post(':id/storage-charges')
  @RequiredPermission(Permission.SHIPMENT_WRITE)
  async addStorageCharges(
    @Param('id') id: string,
    @Body() dto: CreateShipmentChargeDto,
    @Req() req: any,
  ) {
    return this.shipmentsService.addCharge(
      id,
      ['STORAGE', 'STORAGE_FEE'],
      'Storage Charge',
      dto,
      req.user.id,
    );
  }

  @Get(':id/cost-entries')
  async getCostEntries(
    @Param('id') id: string,
    @Query('is_estimated') isEstimatedStr?: string,
  ) {
    let isEstimated: boolean | undefined = undefined;
    if (isEstimatedStr === 'true') isEstimated = true;
    if (isEstimatedStr === 'false') isEstimated = false;
    return this.shipmentsService.getCostEntries(id, isEstimated);
  }

  @Get(':id/estimated-entries')
  async getEstimatedEntries(@Param('id') id: string) {
    return this.shipmentsService.getCostEntries(id, true);
  }

  @Post(':id/cost-entries')
  @UseInterceptors(FileInterceptor('file'))
  async createCostEntry(
    @Param('id') id: string,
    @Body() dto: CreateCostEntryDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    dto.shipmentId = id;
    return this.costEntriesService.create(dto, req.user.id, file);
  }

  @Get(':id/cost-summary')
  async getCostSummary(@Param('id') id: string) {
    return this.costSummaryService.getSummary(id);
  }

  @Post(':id/allocate')
  async allocateShipment(@Param('id') id: string) {
    return this.allocationService.allocateShipment(id);
  }

  @Get(':id/allocations')
  async getShipmentAllocations(
    @Param('id') id: string,
    @Query('item_id') itemId?: string,
  ) {
    return this.allocationService.getAllocationsByShipment(id, itemId);
  }

  @Post(':id/accept-estimates')
  @RequiredPermission(Permission.COST_APPROVE)
  async acceptEstimates(
    @Param('id') id: string,
    @Body('justification') justification: string,
    @Req() req: any,
  ) {
    return this.costEntriesService.acceptEstimates(
      id,
      req.user.id,
      justification,
    );
  }

  @Post(':id/landed-cost/compute')
  @RequiredPermission(Permission.COST_WRITE)
  async computeLandedCostDraft(@Param('id') id: string) {
    return this.landedCostService.computeDraft(id);
  }

  @Get(':id/landed-cost')
  @RequiredPermission(Permission.COST_READ)
  async getLandedCost(@Param('id') id: string) {
    return this.landedCostService.getLandedCostResults(id);
  }

  @Get(':id/finalisation-check')
  @RequiredPermission(Permission.COST_FINALIZE)
  async finalisationCheck(@Param('id') id: string) {
    const blockers = await this.finalisationGuardService.check(id);
    return {
      canFinalise: blockers.length === 0,
      blockers,
    };
  }

  @Post(':id/finalise')
  @RequiredPermission(Permission.COST_FINALIZE)
  async finaliseShipment(@Param('id') id: string, @Req() req: any) {
    return this.landedCostService.finalise(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}
