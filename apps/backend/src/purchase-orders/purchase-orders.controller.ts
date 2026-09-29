import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
  CreatePurchaseOrderDto,
  CreatePoLineDto,
} from './dto/create-purchase-order.dto';
import {
  UpdatePurchaseOrderDto,
  UpdatePoLineDto,
} from './dto/update-purchase-order.dto';
import { ApprovePoDto } from './dto/approve-po.dto';
import { TransitionPoStatusDto } from './dto/transition-po-status.dto';
import { PoStatusService } from './po-status.service';
import { RejectPoDto } from './dto/reject-po.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { Request } from 'express';

@Audited('importPurchaseOrders')
@ApiTags('PurchaseOrders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly poStatusService: PoStatusService,
  ) {}

  @Post()
  @RequiredPermission(Permission.PO_WRITE)
  create(
    @Body() createPoDto: CreatePurchaseOrderDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poService.create(createPoDto, req.user.userId);
  }
  @Get()
  @RequiredPermission(Permission.PO_READ)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.poService.findAll(
      pageNum,
      limitNum,
      status,
      supplierId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @RequiredPermission(Permission.PO_READ)
  findOne(@Param('id') id: string) {
    return this.poService.findOne(id);
  }
  @Patch(':id')
  @RequiredPermission(Permission.PO_WRITE)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poService.update(id, dto, req.user.userId);
  }

  @Post(':id/lines')
  @RequiredPermission(Permission.PO_WRITE)
  addLine(@Param('id') id: string, @Body() dto: CreatePoLineDto) {
    return this.poService.addLine(id, dto);
  }

  @Patch(':id/lines/:lineId')
  @RequiredPermission(Permission.PO_WRITE)
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdatePoLineDto,
  ) {
    return this.poService.updateLine(id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  @RequiredPermission(Permission.PO_WRITE)
  removeLine(@Param('id') id: string, @Param('lineId') lineId: string) {
    return this.poService.removeLine(id, lineId);
  }
  @Post(':id/submit')
  @RequiredPermission(Permission.PO_WRITE)
  submit(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poService.submit(id, req.user.userId);
  }
  @Post(':id/approve')
  @RequiredPermission(Permission.PO_WRITE)
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePoDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poService.approve(id, req.user.userId, dto.comment);
  }
  @Post(':id/reject')
  @RequiredPermission(Permission.PO_WRITE)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPoDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poService.reject(id, req.user.userId, dto.comment);
  }
  @Post(':id/transition')
  @RequiredPermission(Permission.PO_WRITE)
  transition(
    @Param('id') id: string,
    @Body() dto: TransitionPoStatusDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poStatusService.transition(id, dto.status, req.user.userId);
  }
  @Post(':id/close')
  @RequiredPermission(Permission.PO_WRITE)
  closePo(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.poStatusService.transition(id, 'closed', req.user.userId);
  }

  @Get(':id/approvals')
  @RequiredPermission(Permission.PO_READ)
  getApprovals(@Param('id') id: string) {
    return this.poService.getApprovals(id);
  }
}
