const fs = require('fs');
const path = 'src/reports/reports.service.ts';
let code = fs.readFileSync(path, 'utf8');

const newMethod = \
  async getLandedCostBySupplier(filters: ReportFilterDto) {
    const conditions: any[] = [];
    if (filters.supplier_id) conditions.push(eq(schema.importShipments.supplierId, filters.supplier_id));
    if (filters.date_from) conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to) conditions.push(lte(schema.importShipments.createdAt, filters.date_to));
    if (filters.status) conditions.push(eq(schema.importShipments.status, filters.status as any));

    const results = await this.db.select({
      supplierId: schema.importShipments.supplierId,
      supplierName: schema.suppliers.name,
      ciValueEtb: schema.importLandedCostResults.ciValueEtb,
      totalLandedCostEtb: schema.importLandedCostResults.totalLandedCostEtb,
    })
    .from(schema.importLandedCostResults)
    .innerJoin(schema.importShipments, eq(schema.importLandedCostResults.shipmentId, schema.importShipments.id))
    .innerJoin(schema.suppliers, eq(schema.importShipments.supplierId, schema.suppliers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

    const aggregated = new Map<string, any>();
    
    for (const row of results) {
      if (!aggregated.has(row.supplierId)) {
        aggregated.set(row.supplierId, {
          supplierId: row.supplierId,
          supplierName: row.supplierName,
          totalImportValue: 0,
          totalLandedCost: 0,
          totalCharges: 0,
        });
      }
      const supp = aggregated.get(row.supplierId);
      const ci = Number(row.ciValueEtb || 0);
      const tlc = Number(row.totalLandedCostEtb || 0);
      supp.totalImportValue += ci;
      supp.totalLandedCost += tlc;
      supp.totalCharges += (tlc - ci);
    }

    const report = Array.from(aggregated.values()).map(supp => {
      const markupPercent = supp.totalImportValue > 0 
        ? (supp.totalCharges / supp.totalImportValue) * 100 
        : 0;
      return {
        ...supp,
        averageMarkupPercent: Number(markupPercent.toFixed(2)),
      };
    });

    return report.sort((a, b) => b.totalImportValue - a.totalImportValue);
  }
\;

code = code.replace(/}\\s*$/, newMethod + '\\n}\\n');
fs.writeFileSync(path, code);