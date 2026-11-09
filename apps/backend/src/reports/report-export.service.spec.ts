import { ReportExportService } from './report-export.service';

describe('ReportExportService', () => {
  const service = new ReportExportService();

  it('creates a readable Excel workbook', async () => {
    const buffer = await service.toExcel({
      columns: ['shipmentNumber', 'totalLandedCostEtb'],
      rows: [{ shipmentNumber: 'SHP-001', totalLandedCostEtb: 1234.5 }],
    });

    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const workbook = new (require('exceljs').Workbook)();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet('Report');
    expect(worksheet?.getCell('B2').value).toBe(1234.5);
    expect(worksheet?.getCell('B2').numFmt).toBe('#,##0.0000');
  });

  it('creates a PDF with valid font paths', async () => {
    const buffer = await service.toPdf({
      columns: ['shipmentNumber', 'status'],
      rows: [{ shipmentNumber: 'SHP-001', status: 'received' }],
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
