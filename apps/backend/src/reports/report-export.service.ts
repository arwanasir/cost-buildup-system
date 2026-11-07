import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

function formatHeader(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function cellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean;
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

    worksheet.columns = data.columns.map((column) => ({
      header: formatHeader(column),
      key: column,
      width: 25,
    }));

    for (const row of data.rows) {
      worksheet.addRow(
        Object.fromEntries(
          data.columns.map((column) => [column, cellValue(row[column])]),
        ),
      );
    }

    if (data.totals && Object.keys(data.totals).length > 0) {
      worksheet.addRow({});
      worksheet.addRow({ ...data.totals, [data.columns[0]]: 'TOTALS' });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async toPdf(data: {
    columns: string[];
    rows: any[];
    totals?: any;
  }): Promise<Buffer> {
    const columns = data.columns.length ? data.columns : ['data'];
    const body: any[][] = [
      columns.map((column) => ({
        text: formatHeader(column),
        style: 'tableHeader',
      })),
    ];

    for (const row of data.rows) {
      body.push(
        columns.map((column) => {
          const value = cellValue(row[column]);
          return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
        }),
      );
    }

    const docDefinition = {
      pageOrientation: columns.length > 5 ? 'landscape' : 'portrait',
      pageSize: 'A4',
      pageMargins: [24, 32, 24, 32],
      content: [
        { text: 'Report Export', style: 'header' },
        {
          table: {
            headerRows: 1,
            widths: Array(columns.length).fill('*'),
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      defaultStyle: { font: 'Roboto', fontSize: 8 },
      styles: {
        header: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] },
        tableHeader: { bold: true, fontSize: 9, color: '#111827' },
      },
    };

    const pdfMake = require('pdfmake');
    const fontsPath = path.resolve(
      path.dirname(require.resolve('pdfmake')),
      '../fonts/Roboto',
    );
    pdfMake.fonts = {
      Roboto: {
        normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
        bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
        italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf'),
      },
    };

    const document = pdfMake.createPdf(docDefinition as any);
    return document.getBuffer();
  }
}
