import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Res,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { RolePermission, Role } from '../auth/permissions';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../auth/guards/permissions.guards';
import { RequiredPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions';
import { Audited } from '../audit/audited.decorator';

@Audited('reports')
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportExportService: ReportExportService,
  ) {}

  private formatResponse(data: any) {
    let rows = Array.isArray(data) ? data : data;
    let columns: string[] = [];

    // For nested response structures, extract keys
    if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
      rows = [data]; // wrap to provide a unified 'rows' array
    }

    if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object') {
      columns = Object.keys(rows[0]);
    }

    return {
      columns,
      rows,
      totals: {},
      generated_at: new Date().toISOString(),
    };
  }

  @Get('landed-cost-by-shipment')
  @RequiredPermission(Permission.REPORT_LANDED_COST_SHIPMENT_READ)
  async getLandedCostByShipment(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getLandedCostByShipment(filters);
    return this.formatResponse(data);
  }

  @Get('landed-cost-by-item')
  @RequiredPermission(Permission.REPORT_LANDED_COST_ITEM_READ)
  async getLandedCostByItem(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getLandedCostByItem(filters);
    return this.formatResponse(data);
  }

  @Get('landed-cost-by-supplier')
  @RequiredPermission(Permission.REPORT_LANDED_COST_SUPPLIER_READ)
  async getLandedCostBySupplier(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getLandedCostBySupplier(filters);
    return this.formatResponse(data);
  }

  @Get('import-cost-summary')
  @RequiredPermission(Permission.REPORT_IMPORT_COST_SUMMARY_READ)
  async getImportCostSummary(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getImportCostSummary(filters);
    return this.formatResponse(data);
  }

  @Get('lc-status')
  @RequiredPermission(Permission.REPORT_LC_STATUS_READ)
  async getLcStatusReport(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getLcStatusReport(filters);
    return this.formatResponse(data);
  }

  @Get('customs-duty')
  @RequiredPermission(Permission.REPORT_CUSTOMS_DUTY_READ)
  async getCustomsDutyReport(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getCustomsDutyReport(filters);
    return this.formatResponse(data);
  }

  @Get('shipment-status')
  @RequiredPermission(Permission.REPORT_SHIPMENT_STATUS_READ)
  async getShipmentStatusReport(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getShipmentStatusReport(filters);
    return this.formatResponse(data);
  }

  @Get('cost-variance')
  @RequiredPermission(Permission.REPORT_COST_VARIANCE_READ)
  async getCostVarianceReport(@Query() filters: ReportFilterDto) {
    const data = await this.reportsService.getCostVarianceReport(filters);
    return this.formatResponse(data);
  }

  @Get('supplier-performance')
  @RequiredPermission(Permission.REPORT_SUPPLIER_PERFORMANCE_READ)
  async getSupplierPerformanceReport(@Query() filters: ReportFilterDto) {
    const data =
      await this.reportsService.getSupplierPerformanceReport(filters);
    return this.formatResponse(data);
  }

  @Get(':reportKey/export')
  async exportReport(
    @Param('reportKey') reportKey: string,
    @Query() filters: ReportFilterDto,
    @Query('format') format: string,
    @Req() req: Request & { user?: { role?: Role } },
    @Res() res: Response,
  ) {
    const userRole = req.user?.role;
    if (!userRole) throw new ForbiddenException('User role not found');
    const permissions = RolePermission[userRole] || [];

    const keyMap: Record<string, { perm: Permission; method: string }> = {
      'landed-cost-by-shipment': {
        perm: Permission.REPORT_LANDED_COST_SHIPMENT_READ,
        method: 'getLandedCostByShipment',
      },
      'landed-cost-by-item': {
        perm: Permission.REPORT_LANDED_COST_ITEM_READ,
        method: 'getLandedCostByItem',
      },
      'landed-cost-by-supplier': {
        perm: Permission.REPORT_LANDED_COST_SUPPLIER_READ,
        method: 'getLandedCostBySupplier',
      },
      'import-cost-summary': {
        perm: Permission.REPORT_IMPORT_COST_SUMMARY_READ,
        method: 'getImportCostSummary',
      },
      'lc-status': {
        perm: Permission.REPORT_LC_STATUS_READ,
        method: 'getLcStatusReport',
      },
      'customs-duty': {
        perm: Permission.REPORT_CUSTOMS_DUTY_READ,
        method: 'getCustomsDutyReport',
      },
      'shipment-status': {
        perm: Permission.REPORT_SHIPMENT_STATUS_READ,
        method: 'getShipmentStatusReport',
      },
      'cost-variance': {
        perm: Permission.REPORT_COST_VARIANCE_READ,
        method: 'getCostVarianceReport',
      },
      'supplier-performance': {
        perm: Permission.REPORT_SUPPLIER_PERFORMANCE_READ,
        method: 'getSupplierPerformanceReport',
      },
    };

    const map = keyMap[reportKey];
    if (!map) throw new ForbiddenException('Invalid report key');

    if (
      !permissions.includes(map.perm) &&
      !permissions.includes(Permission.ADMIN_ALL)
    ) {
      throw new ForbiddenException('Access denied for this report');
    }

    const data = await (this.reportsService as any)[map.method](filters);
    const formatted = this.formatResponse(data);

    if (format === 'pdf') {
      const buffer = await this.reportExportService.toPdf(formatted);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${reportKey}.pdf`,
      );
      return res.send(buffer);
    } else {
      const buffer = await this.reportExportService.toExcel(formatted);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${reportKey}.xlsx`,
      );
      return res.send(buffer);
    }
  }
}
