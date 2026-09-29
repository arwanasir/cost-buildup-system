import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Audited } from '@/audit/audited.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '@/auth/guards/permissions.guards';
import { RequiredPermission } from '@/auth/decorators/permissions.decorator';
import { Permission } from '@/auth/permissions';
import { Request } from 'express';

@Audited('suppliers')
@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.suppliersService.create(createSupplierDto, req.user.userId);
  }

  @Get()
  @RequiredPermission(Permission.SUPPLIER_READ)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isActiveBool =
      isActive !== undefined ? isActive === 'true' : undefined;

    return this.suppliersService.findAll(
      pageNum,
      limitNum,
      search,
      isActiveBool,
    );
  }

  @Get(':id')
  @RequiredPermission(Permission.SUPPLIER_READ)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Patch(':id')
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.suppliersService.update(id, updateSupplierDto, req.user.userId);
  }

  @Delete(':id/deactivate')
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivate(id);
  }

  @Post(':id/bank-accounts')
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  addBankAccount(@Param('id') id: string, @Body() dto: CreateBankAccountDto) {
    return this.suppliersService.addBankAccount(id, dto);
  }

  @Patch(':id/bank-accounts/:accountId')
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  updateBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.suppliersService.updateBankAccount(id, accountId, dto);
  }

  @Delete(':id/bank-accounts/:accountId')
  @RequiredPermission(Permission.SUPPLIER_WRITE)
  removeBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
  ) {
    return this.suppliersService.removeBankAccount(id, accountId);
  }

  @Get(':id/purchase-orders')
  @RequiredPermission(Permission.PO_READ)
  findSupplierPurchaseOrders(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.suppliersService.findSupplierPurchaseOrders(
      id,
      pageNum,
      limitNum,
    );
  }
}
