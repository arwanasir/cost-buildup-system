import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGrnDto } from './dto/create-grn.dto';
import { AuthGuard } from '@nestjs/passport';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';

@Audited('goodsReceipts')
@ApiTags('GoodsReceipts')
@ApiBearerAuth()
@Controller('goods-receipts')
@UseGuards(AuthGuard('jwt'))
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @RequiredPermission(Permission.GRN_WRITE)
  async createGrn(@Body() dto: CreateGrnDto, @Req() req: any) {
    return this.goodsReceiptsService.createGrn(dto, req.user.id);
  }

  @Get()
  @RequiredPermission(Permission.GRN_READ)
  async getGrns() {
    return this.goodsReceiptsService.getGrns();
  }

  @Get(':id')
  @RequiredPermission(Permission.GRN_READ)
  async getGrnById(@Param('id') id: string) {
    return this.goodsReceiptsService.getGrnById(id);
  }

  @Patch(':id')
  @RequiredPermission(Permission.GRN_WRITE)
  async updateGrn(@Param('id') id: string, @Body() body: any) {
    return this.goodsReceiptsService.updateGrn(id, body);
  }

  @Post(':id/confirm')
  @RequiredPermission(Permission.GRN_WRITE)
  async confirmGrn(@Param('id') id: string, @Req() req: any) {
    return this.goodsReceiptsService.confirmGrn(id, req.user.id);
  }

  @Post(':id/post')
  @RequiredPermission(Permission.GRN_WRITE)
  async postToErp(@Param('id') id: string) {
    return this.goodsReceiptsService.postToErp(id);
  }

  @Post(':id/retry-posting')
  @RequiredPermission(Permission.GRN_WRITE)
  async retryPosting(@Param('id') id: string) {
    return this.goodsReceiptsService.retryPosting(id);
  }

  @Get(':id/discrepancies')
  @RequiredPermission(Permission.GRN_READ)
  async getDiscrepancies(@Param('id') id: string) {
    return this.goodsReceiptsService.getDiscrepancies(id);
  }

  @Get(':id/claims')
  @RequiredPermission(Permission.GRN_READ)
  async getClaims(@Param('id') id: string) {
    return this.goodsReceiptsService.getClaims(id);
  }
}

@Audited('goodsReceipts')
@Controller('claims')
@UseGuards(AuthGuard('jwt'))
export class ClaimsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Patch(':id')
  @RequiredPermission(Permission.GRN_WRITE)
  async updateClaim(@Param('id') id: string, @Body() body: any) {
    return this.goodsReceiptsService.updateClaim(id, body);
  }
}
