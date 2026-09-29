import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as pdfMake from 'pdfmake/build/pdfmake';
const pdfFonts = require('pdfmake/build/vfs_fonts');

(pdfMake as any).vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const bilingualDictionary: Record<string, string> = {
  shipmentId: 'Shipment ID / የጭነት መለያ',
  shipmentNumber: 'Shipment No / የጭነት ቁጥር',
  supplierName: 'Supplier Name / የአቅራቢ ስም',
  period: 'Period / ጊዜ',
  estimatedEtb: 'Estimated (ETB) / የተገመተ (ETB)',
  actualEtb: 'Actual (ETB) / ትክክለኛ (ETB)',
  varianceEtb: 'Variance (ETB) / ልዩነት (ETB)',
  status: 'Status / ሁኔታ',
  eta: 'ETA / የሚጠበቅበት ጊዜ',
  totalLandedCostEtb: 'Total Landed Cost / ጠቅላላ የወረደ ዋጋ',
  perUnitLandedCostEtb: 'Per Unit Landed Cost / የአንድ ዕቃ ዋጋ',
  itemCode: 'Item Code / የዕቃ ኮድ',
  itemName: 'Item Name / የዕቃ ስም',
  category: 'Category / ምድብ',
  totalImportValue: 'Total Import Value / ጠቅላላ አስመጣ ዋጋ',
  totalCharges: 'Total Charges / ጠቅላላ ወጪዎች',
  averageMarkupPercent: 'Avg Markup % / አማካይ የትርፍ %',
  amountForeign: 'Amount (Foreign) / የውጭ ገንዘብ መጠን',
  currency: 'Currency / ምንዛሬ',
  openingDate: 'Opening Date / የተከፈተበት ቀን',
  expiryDate: 'Expiry Date / ማብቂያ ቀን',
  expiringSoon: 'Expiring Soon / በቅርቡ ያበቃል',
  assessedDuty: 'Assessed Duty / የተገመተ ቀረጥ',
  paidDuty: 'Paid Duty / የተከፈለ ቀረጥ',
  actualArrivalDate: 'Actual Arrival / ትክክለኛ መድረሻ',
  isOverdue: 'Is Overdue / ዘግይቷል',
  daysOverdue: 'Days Overdue / የዘገየባቸው ቀናት',
  documentCompletenessAvgScore: 'Doc Completeness Score / የሰነድ ሙሉነት ነጥብ',
  ciPriceVarianceEtb: 'CI Price Variance / CI የዋጋ ልዩነት',
  qualityRejectionRatePct: 'Quality Rejection % / የጥራት ውድቅ %',
  leadTime: 'Lead Time / የመላኪያ ጊዜ',
};

function formatHeader(key: string): string {
  if (bilingualDictionary[key]) return bilingualDictionary[key];
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase());
  return ` / `;
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
        { text: 'Report Export / የሪፖርት ውፅዓት', style: 'header' },
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
        const pdfDocGenerator = pdfMake.createPdf(docDefinition as any);
        (pdfDocGenerator as any).getBuffer((buffer: any) => {
          resolve(buffer);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
