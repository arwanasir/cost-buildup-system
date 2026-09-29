import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportExportService } from './report-export.service';
import { Permission, Role } from '../auth/permissions';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getLandedCostByShipment: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-01', data: 'seeded' }]),
            getLandedCostByItem: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-02', data: 'seeded' }]),
            getLandedCostBySupplier: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-03', data: 'seeded' }]),
            getImportCostSummary: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-04', data: 'seeded' }]),
            getLcStatusReport: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-05', data: 'seeded' }]),
            getCustomsDutyReport: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-06', data: 'seeded' }]),
            getShipmentStatusReport: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-07', data: 'seeded' }]),
            getCostVarianceReport: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-08', data: 'seeded' }]),
            getSupplierPerformanceReport: jest
              .fn()
              .mockResolvedValue([{ id: 'TC-RPT-09', data: 'seeded' }]),
          },
        },
        {
          provide: ReportExportService,
          useValue: {
            toExcel: jest.fn().mockResolvedValue(Buffer.from('excel')),
            toPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  it('TC-RPT-01: should return seeded data for Landed Cost by Shipment', async () => {
    const res = await controller.getLandedCostByShipment({});
    expect(res.rows[0].id).toBe('TC-RPT-01');
    expect(res.columns).toContain('id');
  });

  it('TC-RPT-02: should return seeded data for Landed Cost by Item', async () => {
    const res = await controller.getLandedCostByItem({});
    expect(res.rows[0].id).toBe('TC-RPT-02');
  });

  it('TC-RPT-03: should return seeded data for Landed Cost by Supplier', async () => {
    const res = await controller.getLandedCostBySupplier({});
    expect(res.rows[0].id).toBe('TC-RPT-03');
  });

  it('TC-RPT-04: should return seeded data for Import Cost Summary', async () => {
    const res = await controller.getImportCostSummary({});
    expect(res.rows[0].id).toBe('TC-RPT-04');
  });

  it('TC-RPT-05: should return seeded data for LC Status Report', async () => {
    const res = await controller.getLcStatusReport({});
    expect(res.rows[0].id).toBe('TC-RPT-05');
  });

  it('TC-RPT-06: should return seeded data for Customs Duty Report', async () => {
    const res = await controller.getCustomsDutyReport({});
    expect(res.rows[0].id).toBe('TC-RPT-06');
  });

  it('TC-RPT-07: should return seeded data for Shipment Status Report', async () => {
    const res = await controller.getShipmentStatusReport({});
    expect(res.rows[0].id).toBe('TC-RPT-07');
  });

  it('TC-RPT-08: should return seeded data for Cost Variance Report', async () => {
    const res = await controller.getCostVarianceReport({});
    expect(res.rows[0].id).toBe('TC-RPT-08');
  });

  it('TC-RPT-09: should return seeded data for Supplier Performance Report', async () => {
    const res = await controller.getSupplierPerformanceReport({});
    expect(res.rows[0].id).toBe('TC-RPT-09');
  });

  it('should export PDF successfully for seeded data', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const req = { user: { role: Role.SYSTEM_ADMIN } };
    await controller.exportReport(
      'landed-cost-by-shipment',
      {},
      'pdf',
      req as any,
      mockRes as any,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should export Excel successfully for seeded data', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const req = { user: { role: Role.SYSTEM_ADMIN } };
    await controller.exportReport(
      'shipment-status',
      {},
      'xlsx',
      req as any,
      mockRes as any,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });
});
