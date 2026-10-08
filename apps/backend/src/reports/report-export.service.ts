import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

const bilingualDictionary: Record<string, string> = {
  shipmentId: 'Shipment ID / á‹¨áŒ­áŠ á‰µ áˆ˜áˆˆá‹«',
  shipmentNumber: 'Shipment No / á‹¨áŒ­áŠ á‰µ á‰ áŒ¥áˆ­',
  supplierName: 'Supplier Name / á‹¨áŠ á‰…áˆ«á‰¢ áˆµáˆ ',
  period: 'Period / áŒŠá‹œ',
  estimatedEtb: 'Estimated (ETB) / á‹¨á‰°áŒˆáˆ˜á‰° (ETB)',
  actualEtb: 'Actual (ETB) / á‰µáŠ­áŠ­áˆˆáŠ› (ETB)',
  varianceEtb: 'Variance (ETB) / áˆ á‹©áŠ á‰µ (ETB)',
  status: 'Status / áˆ áŠ”á‰³',
  eta: 'ETA / á‹¨áˆšáŒ á‰ á‰…á‰ á‰µ áŒŠá‹œ',
  totalLandedCostEtb: 'Total Landed Cost / áŒ á‰…áˆ‹áˆ‹ á‹¨á‹ˆáˆ¨á‹° á‹‹áŒ‹',
  perUnitLandedCostEtb: 'Per Unit Landed Cost / á‹¨áŠ áŠ•á‹µ á‹•á‰ƒ á‹‹áŒ‹',
  itemCode: 'Item Code / á‹¨á‹•á‰ƒ áŠ®á‹µ',
  itemName: 'Item Name / á‹¨á‹•á‰ƒ áˆµáˆ ',
  category: 'Category / áˆ á‹µá‰¥',
  totalImportValue: 'Total Import Value / áŒ á‰…áˆ‹áˆ‹ áŠ áˆµáˆ˜áŒ£ á‹‹áŒ‹',
  totalCharges: 'Total Charges / áŒ á‰…áˆ‹áˆ‹ á‹ˆáŒªá‹Žá‰½',
  averageMarkupPercent: 'Avg Markup % / áŠ áˆ›áŠ«á‹­ á‹¨á‰µáˆ­á   %',
  amountForeign: 'Amount (Foreign) / á‹¨á‹ áŒ­ áŒˆáŠ•á‹˜á‰¥ áˆ˜áŒ áŠ•',
  currency: 'Currency / áˆ áŠ•á‹›áˆ¬',
  openingDate: 'Opening Date / á‹¨á‰°áŠ¨á ˆá‰°á‰ á‰µ á‰€áŠ•',
  expiryDate: 'Expiry Date / áˆ›á‰¥á‰‚á‹« á‰€áŠ•',
  expiringSoon: 'Expiring Soon / á‰ á‰…áˆ­á‰¡ á‹«á‰ á‰ƒáˆ ',
  assessedDuty: 'Assessed Duty / á‹¨á‰°áŒˆáˆ˜á‰° á‰€áˆ¨áŒ¥',
  paidDuty: 'Paid Duty / á‹¨á‰°áŠ¨á ˆáˆˆ á‰€áˆ¨áŒ¥',
  actualArrivalDate: 'Actual Arrival / á‰µáŠ­áŠ­áˆˆáŠ› áˆ˜á‹µáˆ¨áˆ»',
  isOverdue: 'Is Overdue / á‹˜áŒ á‹­á‰·áˆ ',
  daysOverdue: 'Days Overdue / á‹¨á‹˜áŒˆá‹¨á‰£á‰¸á‹  á‰€áŠ“á‰µ',
  documentCompletenessAvgScore:
    'Doc Completeness Score / á‹¨áˆ°áŠ á‹µ áˆ™áˆ‰áŠ á‰µ áŠ áŒ¥á‰¥',
  ciPriceVarianceEtb: 'CI Price Variance / CI á‹¨á‹‹áŒ‹ áˆ á‹©áŠ á‰µ',
  qualityRejectionRatePct: 'Quality Rejection % / á‹¨áŒ¥áˆ«á‰µ á‹ á‹µá‰… %',
  leadTime: 'Lead Time / á‹¨áˆ˜áˆ‹áŠªá‹« áŒŠá‹œ',
};

function formatHeader(key: string): string {
  if (bilingualDictionary[key]) return bilingualDictionary[key];
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
  return formatted + ' / ' + formatted;
}

@Injectable()
export class ReportExportService {
  async toExcel(data: {
    columns: string[];
    rows: any[];
    totals?: any;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = data.columns.map((col) => ({
      header: formatHeader(col),
      key: col,
      width: 25,
    }));

    data.rows.forEach((row) => {
      const flatRow = { ...row };
      for (const k of Object.keys(flatRow)) {
        if (typeof flatRow[k] === 'object' && flatRow[k] !== null) {
          flatRow[k] = JSON.stringify(flatRow[k]);
        }
      }
      worksheet.addRow(flatRow);
    });

    if (data.totals && Object.keys(data.totals).length > 0) {
      worksheet.addRow({});
      worksheet.addRow({ ...data.totals, [data.columns[0]]: 'TOTALS' });
    }

    const buf = await workbook.xlsx.writeBuffer();
    return buf as any as Buffer;
  }

  async toPdf(data: {
    columns: string[];
    rows: any[];
    totals?: any;
  }): Promise<Buffer> {
    let headers = data.columns.map((col) => ({
      text: formatHeader(col),
      style: 'tableHeader',
    }));
    if (headers.length === 0)
      headers = [{ text: 'Data', style: 'tableHeader' }];

    const body: any[] = [headers];
    data.rows.forEach((row) => {
      const rowData = data.columns.map((col) => {
        const val = row[col];
        return val !== null && val !== undefined
          ? typeof val === 'object'
            ? JSON.stringify(val)
            : String(val)
          : '';
      });
      if (rowData.length === 0) rowData.push('No data');
      body.push(rowData);
    });

    const docDefinition = {
      content: [
        {
          text: 'Report Export / á‹¨áˆªá –áˆ­á‰µ á‹ á …á‹“á‰µ',
          style: 'header',
        },
        {
          style: 'tableExample',
          table: {
            headerRows: 1,
            widths: Array(Math.max(1, data.columns.length)).fill('auto'),
            body: body,
          },
        },
      ],
      defaultStyle: {},
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        tableExample: { margin: [0, 5, 0, 15] },
        tableHeader: { bold: true, fontSize: 13, color: 'black' },
      },
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfMake = require('pdfmake');
        pdfMake.fonts = {
          Roboto: {
            normal: path.join(
              __dirname,
              '../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf',
            ),
            bold: path.join(
              __dirname,
              '../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf',
            ),
            italics: path.join(
              __dirname,
              '../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf',
            ),
            bolditalics: path.join(
              __dirname,
              '../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf',
            ),
          },
        };
        const doc = pdfMake.createPdf(docDefinition as any);
        doc
          .getBuffer()
          .then((buffer: any) => resolve(buffer))
          .catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }
}
