import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  Patch,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { LettersOfCreditService } from './letters-of-credit.service';
import { LcStatusService } from './lc-status.service';
import { LcAlertScheduler } from './lc-alert.scheduler';
import { CreateLcDto } from './dto/create-lc.dto';
import { AmendLcDto } from './dto/amend-lc.dto';
import { AddBankChargeDto } from './dto/add-bank-charge.dto';
import { UpdateLcDto, MarkDocumentReceivedDto } from './dto/update-lc.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

@Audited('lettersOfCredit')
@ApiTags('LettersOfCredit')
@ApiBearerAuth()
@Controller('letters-of-credit')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class LettersOfCreditController {
  constructor(
    private readonly lettersOfCreditService: LettersOfCreditService,
    private readonly lcStatusService: LcStatusService,
    private readonly lcAlertScheduler: LcAlertScheduler,
  ) {}

  @Post()
  @RequiredPermission(Permission.LC_WRITE)
  async create(@Body() createLcDto: CreateLcDto, @Req() req: any) {
    return this.lettersOfCreditService.create(createLcDto, req.user.userId);
  }

  @Post(':id/gm-approve')
  @RequiredPermission(Permission.LC_APPROVE)
  async gmApprove(@Param('id') id: string, @Req() req: any) {
    return this.lettersOfCreditService.gmApprove(id, req.user.userId);
  }

  @Patch(':id/status')
  @RequiredPermission(Permission.LC_WRITE)
  async transitionStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.lcStatusService.transition(id, status, req.user.userId);
  }
  @Get()
  @RequiredPermission(Permission.LC_READ)
  async findAll(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('expiringWithinDays') expiringWithinDays?: number,
  ) {
    return this.lettersOfCreditService.findAll({
      status,
      supplierId,
      expiringWithinDays,
    });
  }

  @Get(':id')
  @RequiredPermission(Permission.LC_READ)
  async findOne(@Param('id') id: string) {
    return this.lettersOfCreditService.findOne(id);
  }

  @Patch(':id')
  @RequiredPermission(Permission.LC_WRITE)
  async update(
    @Param('id') id: string,
    @Body() updateLcDto: UpdateLcDto,
    @Req() req: any,
  ) {
    return this.lettersOfCreditService.update(id, updateLcDto, req.user.id);
  }

  @Get(':id/charges')
  @RequiredPermission(Permission.LC_READ)
  async getCharges(@Param('id') id: string) {
    return this.lettersOfCreditService.getCharges(id);
  }

  @Patch(':id/documents/:docId')
  @RequiredPermission(Permission.LC_WRITE)
  async markDocumentReceived(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() dto: MarkDocumentReceivedDto,
  ) {
    return this.lettersOfCreditService.markDocumentReceived(
      id,
      docId,
      dto.isReceived,
    );
  }

  @Post('alerts/run')
  @RequiredPermission(Permission.ADMIN_ALL)
  async runAlertsManually() {
    await this.lcAlertScheduler.checkLcAlerts();
    return { success: true, message: 'LC Alert Scheduler triggered manually' };
  }

  @Post(':id/amendments')
  @RequiredPermission(Permission.LC_WRITE)
  async amend(
    @Param('id') id: string,
    @Body() amendLcDto: AmendLcDto,
    @Req() req: any,
  ) {
    return this.lettersOfCreditService.amend(id, amendLcDto, req.user.userId);
  }
}
