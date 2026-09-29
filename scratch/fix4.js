const fs = require('fs');
const crypto = require('crypto');
function uuid() { return crypto.randomUUID(); }
const dateStr = new Date().toISOString().split('T')[0];

const supplierId = uuid();
const acc1 = uuid();
const acc2 = uuid();

let itemIds = Array.from({length: 8}, () => uuid());

const po1 = uuid();
const po2 = uuid();
const po3 = uuid();
const poApprovals = [uuid(), uuid(), uuid()];
const poLines = [uuid(), uuid(), uuid(), uuid()];

const lc1 = uuid();
const shipment1 = uuid();
const shipment2 = uuid();
const shipmentItems = [uuid(), uuid(), uuid(), uuid()];

const ci1 = uuid();
const ci2 = uuid();
const decl1 = uuid();
const grn1 = uuid();

const content = `import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as schema from '../schema/schema';

dotenv.config({ path: '../.env' });

const connectionString =
  process.env.SEED_DATABASE_URL ||
  process.env.DRIZZLE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgres://cost_buildup_user:password@localhost:5432/cost_buildup_db';

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

export async function seedDemoData() {
  console.log('   -> Seeding Demo Data...');
  
  const allUsers = await db.select().from(schema.users);
  const systemUserId = allUsers[0]?.id || '${uuid()}';

  const allCategories = await db.select().from(schema.costCategories);
  const getCatId = (code: string) => allCategories.find(c => c.code === code)?.id || '${uuid()}';

  // 1. Supplier & Bank Accounts
  await db.insert(schema.suppliers).values([
    {
      id: '${supplierId}',
      code: 'SUP-DEMO',
      name: 'Demo Global Suppliers Ltd',
      countryOfOrigin: 'CN',
      status: 'active'
    }
  ]);
  
  await db.insert(schema.suppliersBankAccounts).values([
    {
      id: '${acc1}',
      supplierId: '${supplierId}',
      bankName: 'HSBC China',
      accountNumber: '123456789',
      currency: 'USD',
      swiftCode: 'HSBCCN',
      isPrimary: true,
      status: 'active'
    },
    {
      id: '${acc2}',
      supplierId: '${supplierId}',
      bankName: 'Standard Chartered',
      accountNumber: '987654321',
      currency: 'EUR',
      swiftCode: 'SCBLCN',
      isPrimary: false,
      status: 'active'
    }
  ]);

  // 2. Items
  const items = [${itemIds.map((id, i) => `{
    id: '${id}',
    itemCode: 'ITM-00${i+1}',
    name: 'Demo Item ${i+1}',
    description: 'A demo item for reporting',
    defaultHsCode: '8517.12.00',
    unitOfMeasure: 'PCS',
    isActive: true
  }`).join(',')}];
  await db.insert(schema.items).values(items);

  // 3. Purchase Orders (Approved)
  await db.insert(schema.importPurchaseOrders).values([
    {
      id: '${po1}',
      poNumber: 'PO-DEMO-001',
      supplierId: '${supplierId}',
      poDate: '${dateStr}',
      status: 'approved',
      incoterm: 'FOB',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '15000.00',
      totalValueEtb: '15000.00'
    },
    {
      id: '${po2}',
      poNumber: 'PO-DEMO-002',
      supplierId: '${supplierId}',
      poDate: '${dateStr}',
      status: 'approved',
      incoterm: 'CIF',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '20000.00',
      totalValueEtb: '20000.00'
    },
    {
      id: '${po3}',
      poNumber: 'PO-DEMO-003',
      supplierId: '${supplierId}',
      poDate: '${dateStr}',
      status: 'approved',
      incoterm: 'EXW',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '5000.00',
      totalValueEtb: '5000.00'
    }
  ]);

  // PO Approvals
  await db.insert(schema.poApprovals).values([
    { id: '${poApprovals[0]}', poId: '${po1}', decision: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager', comment: 'Approved' },
    { id: '${poApprovals[1]}', poId: '${po2}', decision: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager', comment: 'Approved' },
    { id: '${poApprovals[2]}', poId: '${po3}', decision: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager', comment: 'Approved' }
  ]);

  // PO Lines
  await db.insert(schema.poLines).values([
    { id: '${poLines[0]}', poId: '${po1}', lineNo: 1, itemId: '${itemIds[0]}', quantity: '100', unitPrice: '50', totalLineValue: '5000', unitOfMeasure: 'PCS' },
    { id: '${poLines[1]}', poId: '${po1}', lineNo: 2, itemId: '${itemIds[1]}', quantity: '200', unitPrice: '50', totalLineValue: '10000', unitOfMeasure: 'PCS' },
    { id: '${poLines[2]}', poId: '${po2}', lineNo: 1, itemId: '${itemIds[2]}', quantity: '100', unitPrice: '200', totalLineValue: '20000', unitOfMeasure: 'PCS' },
    { id: '${poLines[3]}', poId: '${po3}', lineNo: 1, itemId: '${itemIds[3]}', quantity: '50', unitPrice: '100', totalLineValue: '5000', unitOfMeasure: 'PCS' }
  ]);

  // 4. Letter of Credit with Charges
  await db.insert(schema.lettersOfCredit).values([
    {
      id: '${lc1}',
      supplierId: '${supplierId}',
      lcNumber: 'LC-DEMO-001',
      issuingBank: 'Bank of Demo',
      amountForeign: '15000.00',
      currency: 'USD',
      fxRate: '1',
      amountEtb: '15000.00',
      openingDate: '${dateStr}',
      expiryDate: '2027-12-31',
      status: 'opened',
      lcType: 'sight'
    }
  ]);

  await db.insert(schema.lcBankCharges).values([
    { id: '${uuid()}', lcId: '${lc1}', chargeType: 'opening_fee', amountEtb: '150.00', chargeDate: '${dateStr}' },
    { id: '${uuid()}', lcId: '${lc1}', chargeType: 'swift', amountEtb: '25.00', chargeDate: '${dateStr}' }
  ]);

  // 5. Shipments with Documents and CI
  await db.insert(schema.importShipments).values([
    { id: '${shipment1}', shipmentNumber: 'SHP-DEMO-001', poId: '${po1}', supplierId: '${supplierId}', status: 'shipped', portOfLoading: 'Shanghai', portOfDestination: 'Djibouti', estimatedArrival: '${dateStr}' },
    { id: '${shipment2}', shipmentNumber: 'SHP-DEMO-002', poId: '${po2}', supplierId: '${supplierId}', status: 'received', portOfLoading: 'Shenzhen', portOfDestination: 'Djibouti', actualArrival: '${dateStr}' }
  ]);

  // Shipment Items
  await db.insert(schema.shipmentItems).values([
    { id: '${shipmentItems[0]}', shipmentId: '${shipment1}', poLineId: '${poLines[0]}', itemId: '${itemIds[0]}', shippedQuantity: '100', ciUnitPrice: '50', ciValueForeign: '5000', ciValueEtb: '5000' },
    { id: '${shipmentItems[1]}', shipmentId: '${shipment1}', poLineId: '${poLines[1]}', itemId: '${itemIds[1]}', shippedQuantity: '200', ciUnitPrice: '50', ciValueForeign: '10000', ciValueEtb: '10000' },
    { id: '${shipmentItems[2]}', shipmentId: '${shipment2}', poLineId: '${poLines[2]}', itemId: '${itemIds[2]}', shippedQuantity: '100', ciUnitPrice: '200', ciValueForeign: '20000', ciValueEtb: '20000' }
  ]);

  await db.insert(schema.commercialInvoices).values([
    { id: '${ci1}', shipmentId: '${shipment1}', invoiceNumber: 'INV-001', invoiceDate: '${dateStr}', totalForeign: '15000.00', totalEtb: '15000.00', fxRate: '1', currency: 'USD' },
    { id: '${ci2}', shipmentId: '${shipment2}', invoiceNumber: 'INV-002', invoiceDate: '${dateStr}', totalForeign: '20000.00', totalEtb: '20000.00', fxRate: '1', currency: 'USD' }
  ]);
  
  await db.insert(schema.shipmentDocuments).values([
    { id: '${uuid()}', shipmentId: '${shipment1}', documentType: 'bl', referenceNumber: 'BL-001', objectKey: 'bl-1.pdf', fileName: 'bl-1.pdf', mimeType: 'application/pdf', sizeBytes: 1024, uploadedBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', documentType: 'bl', referenceNumber: 'BL-002', objectKey: 'bl-2.pdf', fileName: 'bl-2.pdf', mimeType: 'application/pdf', sizeBytes: 1024, uploadedBy: systemUserId }
  ]);

  // 6. Customs Declarations
  await db.insert(schema.customsDeclarations).values([
    { id: '${decl1}', shipmentId: '${shipment2}', declarationNumber: 'DEC-001', declarationDate: '${dateStr}', status: 'assessed', cifValueEtb: '10000.00', totalAssessmentEtb: '1000.00' }
  ]);

  // 7. Duty payments
  await db.insert(schema.dutyPayments).values([
    { id: '${uuid()}', declarationId: '${decl1}', receiptNumber: 'REC-001', paymentDate: '${dateStr}', amountPaidEtb: '1000.00' }
  ]);

  // 8. Cost entries in every category
  await db.insert(schema.importCostEntries).values([
    { id: '${uuid()}', shipmentId: '${shipment1}', costCategoryId: getCatId('FOB'), amountForeign: '15000', amountEtb: '15000', currency: 'USD', providerName: 'Supplier', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment1}', costCategoryId: getCatId('FREIGHT'), amountForeign: '1000', amountEtb: '1000', currency: 'USD', providerName: 'Shipping Co', fxRate: '1', allocationMethod: 'by_weight', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment1}', costCategoryId: getCatId('INSURANCE'), amountForeign: '100', amountEtb: '100', currency: 'USD', providerName: 'Insurer', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', costCategoryId: getCatId('CUSTOMS_DUTY'), amountForeign: '1000', amountEtb: '1000', currency: 'ETB', providerName: 'Customs', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', costCategoryId: getCatId('EXCISE'), amountForeign: '200', amountEtb: '200', currency: 'ETB', providerName: 'Customs', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', costCategoryId: getCatId('CLEARANCE'), amountForeign: '500', amountEtb: '500', currency: 'ETB', providerName: 'Agent', fxRate: '1', allocationMethod: 'by_volume', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment1}', costCategoryId: getCatId('BANK_CHARGES'), amountForeign: '50', amountEtb: '50', currency: 'ETB', providerName: 'Bank', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', costCategoryId: getCatId('TRANSPORT'), amountForeign: '800', amountEtb: '800', currency: 'ETB', providerName: 'Transporter', fxRate: '1', allocationMethod: 'by_weight', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment2}', costCategoryId: getCatId('WAREHOUSING'), amountForeign: '300', amountEtb: '300', currency: 'ETB', providerName: 'Warehouse', fxRate: '1', allocationMethod: 'by_volume', createdBy: systemUserId },
    { id: '${uuid()}', shipmentId: '${shipment1}', costCategoryId: getCatId('OTHER'), amountForeign: '150', amountEtb: '150', currency: 'ETB', providerName: 'Misc', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
  ]);

  // 9. Confirmed GRN
  await db.insert(schema.goodsReceipts).values([
    { id: '${grn1}', shipmentId: '${shipment2}', poId: '${po2}', grnNumber: 'GRN-001', receiptDate: '${dateStr}', status: 'confirmed', warehouseLocation: 'WH-Main', receivedBy: systemUserId }
  ]);
  
  await db.insert(schema.goodsReceiptItems).values([
    { id: '${uuid()}', grnId: '${grn1}', shipmentItemId: '${shipmentItems[2]}', receivedQuantity: '98', acceptedQuantity: '95', rejectedQuantity: '3', perUnitLandedCostEtb: '0.00', lineValueEtb: '1000' }
  ]);

  // 10. Variances
  await db.insert(schema.costVariances).values([
    { id: '${uuid()}', shipmentId: '${shipment2}', varianceType: 'price', estimatedEtb: '20000', actualEtb: '21000', varianceEtb: '1000', variancePct: '5.000000', comment: 'Supplier raised price' },
    { id: '${uuid()}', shipmentId: '${shipment2}', varianceType: 'other', estimatedEtb: '100', actualEtb: '95', varianceEtb: '-5', variancePct: '-5.000000', comment: 'Short shipment' }
  ]);
}
`;
fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator perfectly');
