const fs = require('fs');
const path = 'src/reports/reports.service.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('BadRequestException')) {
  code = code.replace("import { Injectable, Inject } from '@nestjs/common';", "import { Injectable, Inject, BadRequestException } from '@nestjs/common';");
}

const newMethod = \
  async getLandedCostByItem(filters: ReportFilterDto) {
    if (!filters.item_id) {
      throw new BadRequestException('item_id is required for this report');
    }

    const conditions: any[] = [eq(schema.importLandedCostResults.itemId, filters.item_id)];

    if (filters.shipment_id) conditions.push(eq(schema.importShipments.id, filters.shipment_id));
    if (filters.supplier_id) conditions.push(eq(schema.importShipments.supplierId, filters.supplier_id));
    if (filters.status) conditions.push(eq(schema.importShipments.status, filters.status as any));
    if (filters.date_from) conditions.push(gte(schema.importShipments.createdAt, filters.date_from));
    if (filters.date_to) conditions.push(lte(schema.importShipments.createdAt, filters.date_to));

    const results = await this.db.select({
      shipmentId: schema.importShipments.id,
      shipmentNumber: schema.importShipments.shipmentNumber,
      shipmentDate: schema.importShipments.createdAt,
      supplierId: schema.importShipments.supplierId,
      itemId: schema.items.id,
      itemName: schema.items.name,
      hsCode: schema.items.defaultHsCode,
      quantity: schema.importLandedCostResults.quantityReceived,
      perUnitLandedCostEtb: schema.importLandedCostResults.perUnitLandedCostEtb,
      totalLandedCostEtb: schema.importLandedCostResults.totalLandedCostEtb,
      ciValueEtb: schema.importLandedCostResults.ciValueEtb,
      customsDutyEtb: schema.importLandedCostResults.customsDutyEtb,
      importVatEtb: schema.importLandedCostResults.importVatEtb,
      freightAllocatedEtb: schema.importLandedCostResults.freightAllocatedEtb,
      insuranceAllocatedEtb: schema.importLandedCostResults.insuranceAllocatedEtb,
      bankChargesAllocatedEtb: schema.importLandedCostResults.bankChargesAllocatedEtb,
      portChargesAllocatedEtb: schema.importLandedCostResults.portChargesAllocatedEtb,
      clearingFeeAllocatedEtb: schema.importLandedCostResults.clearingFeeAllocatedEtb,
      otherChargesAllocatedEtb: schema.importLandedCostResults.otherChargesAllocatedEtb,
    })
    .from(schema.importLandedCostResults)
    .innerJoin(schema.importShipments, eq(schema.importLandedCostResults.shipmentId, schema.importShipments.id))
    .innerJoin(schema.items, eq(schema.importLandedCostResults.itemId, schema.items.id))
    .where(and(...conditions));
    
    results.sort((a: any, b: any) => new Date(a.shipmentDate).getTime() - new Date(b.shipmentDate).getTime());

    return results.map((row: any) => {
      const qty = Number(row.quantity);
      const safeDiv = (val: any) => qty > 0 ? Number(val || 0) / qty : 0;
      
      return {
        shipmentId: row.shipmentId,
        shipmentNumber: row.shipmentNumber,
        shipmentDate: row.shipmentDate,
        supplierId: row.supplierId,
        itemId: row.itemId,
        itemName: row.itemName,
        hsCode: row.hsCode,
        quantity: qty,
        totalPerUnitCost: Number(row.perUnitLandedCostEtb),
        perUnitBreakdown: {
          ciValue: safeDiv(row.ciValueEtb),
          customsDuty: safeDiv(row.customsDutyEtb),
          importVat: safeDiv(row.importVatEtb),
          freight: safeDiv(row.freightAllocatedEtb),
          insurance: safeDiv(row.insuranceAllocatedEtb),
          bankCharges: safeDiv(row.bankChargesAllocatedEtb),
          portCharges: safeDiv(row.portChargesAllocatedEtb),
          clearingFee: safeDiv(row.clearingFeeAllocatedEtb),
          otherCharges: safeDiv(row.otherChargesAllocatedEtb),
        },
        totalBreakdown: {
          totalLandedCost: Number(row.totalLandedCostEtb),
          ciValue: Number(row.ciValueEtb),
          customsDuty: Number(row.customsDutyEtb),
          importVat: Number(row.importVatEtb),
          freight: Number(row.freightAllocatedEtb),
          insurance: Number(row.insuranceAllocatedEtb),
          bankCharges: Number(row.bankChargesAllocatedEtb),
          portCharges: Number(row.portChargesAllocatedEtb),
          clearingFee: Number(row.clearingFeeAllocatedEtb),
          otherCharges: Number(row.otherChargesAllocatedEtb),
        }
      };
    });
  }
\;

code = code.replace(/}\\s*$/, newMethod + '\\n}\\n');
fs.writeFileSync(path, code);