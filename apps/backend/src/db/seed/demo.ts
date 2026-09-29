import { drizzle } from 'drizzle-orm/node-postgres';
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
  const systemUserId =
    allUsers[0]?.id || '3b917026-aaa9-4157-9001-ba017ad8df80';

  const allCategories = await db.select().from(schema.costCategories);
  const getCatId = (code: string) =>
    allCategories.find((c) => c.code === code)?.id ||
    'b1b102d3-a8e6-45dc-8b53-186e7eb3f68b';

  // 1. Supplier & Bank Accounts
  await db.insert(schema.suppliers).values([
    {
      id: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      supplierCode: 'SUP-DEMO',
      name: 'Demo Global Suppliers Ltd',
      country: 'CN',
    },
  ]);

  await db.insert(schema.suppliersBankAccounts).values([
    {
      id: '571ecf1e-77c8-4e6f-9da2-af14e5298eb5',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      bankName: 'HSBC China',
      ibanOrAccount: '123456789',
      currency: 'USD',
      swift: 'HSBCCN',
      isDefault: true,
    },
    {
      id: 'd8210ed9-7b15-430b-b517-41c82b7c9730',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      bankName: 'Standard Chartered',
      ibanOrAccount: '987654321',
      currency: 'EUR',
      swift: 'SCBLCN',
      isDefault: false,
    },
  ]);

  // 2. Items
  const items = [
    {
      id: '3e61b3dd-6643-44a3-925c-e0e58a9a53a0',
      itemCode: 'ITM-001',
      name: 'Demo Item 1',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: '6c8ad588-6e3d-40b3-a36d-00e3ee8428c3',
      itemCode: 'ITM-002',
      name: 'Demo Item 2',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: '4d7a1265-15ae-45c4-862e-29d85c738d29',
      itemCode: 'ITM-003',
      name: 'Demo Item 3',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: 'ad1980ee-fd1e-4264-a71f-601aabf7894e',
      itemCode: 'ITM-004',
      name: 'Demo Item 4',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: 'da5d4b53-836f-430d-862f-fcd82037e125',
      itemCode: 'ITM-005',
      name: 'Demo Item 5',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: 'b6c510a7-9f70-4847-85cc-08d6bde3d674',
      itemCode: 'ITM-006',
      name: 'Demo Item 6',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: 'b8e2ec19-355f-43fc-97a1-e10101c37611',
      itemCode: 'ITM-007',
      name: 'Demo Item 7',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
    {
      id: 'f7b4eaf0-b332-4878-9263-d045b295bc32',
      itemCode: 'ITM-008',
      name: 'Demo Item 8',
      description: 'A demo item for reporting',
      defaultHsCode: '8517.12.00',
      unitOfMeasure: 'PCS',
      isActive: true,
    },
  ];
  await db.insert(schema.items).values(items);

  // 3. Purchase Orders (Approved)
  await db.insert(schema.importPurchaseOrders).values([
    {
      id: 'a7c28d54-357b-4d14-88d0-5838bdbc98db',
      poNumber: 'PO-DEMO-001',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      poDate: '2026-09-28',
      status: 'approved',
      incoterm: 'FOB',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '15000.00',
      totalValueEtb: '15000.00',
    },
    {
      id: '534bf7e4-1dac-4065-9e54-1b553c42e91c',
      poNumber: 'PO-DEMO-002',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      poDate: '2026-09-28',
      status: 'approved',
      incoterm: 'CIF',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '20000.00',
      totalValueEtb: '20000.00',
    },
    {
      id: '7bbcae9e-2172-4582-971a-81e96efd9ddd',
      poNumber: 'PO-DEMO-003',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      poDate: '2026-09-28',
      status: 'approved',
      incoterm: 'EXW',
      currency: 'USD',
      fxRate: '1',
      totalValueForeign: '5000.00',
      totalValueEtb: '5000.00',
    },
  ]);

  // PO Approvals
  await db.insert(schema.poApprovals).values([
    {
      id: 'cc85bcf3-749b-4cf3-ae7e-ce256736d734',
      poId: 'a7c28d54-357b-4d14-88d0-5838bdbc98db',
      decision: 'approved',
      approverId: systemUserId,
      requiredRole: 'procurement_manager',
      comment: 'Approved',
    },
    {
      id: 'd7f29d35-cb31-4575-a362-f87c81c97246',
      poId: '534bf7e4-1dac-4065-9e54-1b553c42e91c',
      decision: 'approved',
      approverId: systemUserId,
      requiredRole: 'procurement_manager',
      comment: 'Approved',
    },
    {
      id: '4654cc0f-a41e-4bdc-a49f-f6261eeefa2a',
      poId: '7bbcae9e-2172-4582-971a-81e96efd9ddd',
      decision: 'approved',
      approverId: systemUserId,
      requiredRole: 'procurement_manager',
      comment: 'Approved',
    },
  ]);

  // PO Lines
  await db.insert(schema.poLines).values([
    {
      id: '06fd06b5-8ec4-4424-9fad-7f8c1ae48925',
      poId: 'a7c28d54-357b-4d14-88d0-5838bdbc98db',
      lineNo: 1,
      itemId: '3e61b3dd-6643-44a3-925c-e0e58a9a53a0',
      quantity: '100',
      unitPrice: '50',
      totalLineValue: '5000',
      unitOfMeasure: 'PCS',
    },
    {
      id: 'e3a7774d-85e2-4bb5-b4da-18056ffbbd60',
      poId: 'a7c28d54-357b-4d14-88d0-5838bdbc98db',
      lineNo: 2,
      itemId: '6c8ad588-6e3d-40b3-a36d-00e3ee8428c3',
      quantity: '200',
      unitPrice: '50',
      totalLineValue: '10000',
      unitOfMeasure: 'PCS',
    },
    {
      id: 'b71050d3-cf47-45fd-b558-5e39b81d40fd',
      poId: '534bf7e4-1dac-4065-9e54-1b553c42e91c',
      lineNo: 1,
      itemId: '4d7a1265-15ae-45c4-862e-29d85c738d29',
      quantity: '100',
      unitPrice: '200',
      totalLineValue: '20000',
      unitOfMeasure: 'PCS',
    },
    {
      id: '910d0919-cd57-4cdd-b2f9-edba5a373f13',
      poId: '7bbcae9e-2172-4582-971a-81e96efd9ddd',
      lineNo: 1,
      itemId: 'ad1980ee-fd1e-4264-a71f-601aabf7894e',
      quantity: '50',
      unitPrice: '100',
      totalLineValue: '5000',
      unitOfMeasure: 'PCS',
    },
  ]);

  // 4. Letter of Credit with Charges
  await db.insert(schema.lettersOfCredit).values([
    {
      id: '6c2d8eee-8b4c-4d80-a344-bd3ada826671',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      lcNumber: 'LC-DEMO-001',
      issuingBank: 'Bank of Demo',
      amountForeign: '15000.00',
      currency: 'USD',
      fxRate: '1',
      amountEtb: '15000.00',
      openingDate: '2026-09-28',
      expiryDate: '2027-12-31',
      status: 'opened',
      lcType: 'sight',
    },
  ]);

  await db.insert(schema.lcBankCharges).values([
    {
      id: 'e0a02e10-3e5b-4241-8409-13f03d27e7e6',
      lcId: '6c2d8eee-8b4c-4d80-a344-bd3ada826671',
      chargeType: 'opening_fee',
      amountEtb: '150.00',
      chargeDate: '2026-09-28',
    },
    {
      id: '947f37dc-ff80-4e39-b01f-cb580713cf4b',
      lcId: '6c2d8eee-8b4c-4d80-a344-bd3ada826671',
      chargeType: 'swift',
      amountEtb: '25.00',
      chargeDate: '2026-09-28',
    },
  ]);

  // 5. Shipments with Documents and CI
  await db.insert(schema.importShipments).values([
    {
      id: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      shipmentNumber: 'SHP-DEMO-001',
      poId: 'a7c28d54-357b-4d14-88d0-5838bdbc98db',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      status: 'shipped',
      portOfLoading: 'Shanghai',
      portOfDestination: 'Djibouti',
      eta: '2026-09-28',
    },
    {
      id: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      shipmentNumber: 'SHP-DEMO-002',
      poId: '534bf7e4-1dac-4065-9e54-1b553c42e91c',
      supplierId: 'b94219e6-cbad-45d0-a8c8-f965855ee558',
      status: 'received',
      portOfLoading: 'Shenzhen',
      portOfDestination: 'Djibouti',
      actualArrivalDate: '2026-09-28',
    },
  ]);

  // Shipment Items
  await db.insert(schema.shipmentItems).values([
    {
      id: '1ed77f17-af34-42b4-995a-a582a86f61d4',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      poLineId: '06fd06b5-8ec4-4424-9fad-7f8c1ae48925',
      itemId: '3e61b3dd-6643-44a3-925c-e0e58a9a53a0',
      shippedQuantity: '100',
      ciUnitPrice: '50',
      ciValueForeign: '5000',
      ciValueEtb: '5000',
    },
    {
      id: '5773ed80-2e88-4d30-a191-4a5c7dc9967c',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      poLineId: 'e3a7774d-85e2-4bb5-b4da-18056ffbbd60',
      itemId: '6c8ad588-6e3d-40b3-a36d-00e3ee8428c3',
      shippedQuantity: '200',
      ciUnitPrice: '50',
      ciValueForeign: '10000',
      ciValueEtb: '10000',
    },
    {
      id: '3f6651f6-c205-4a5c-ae79-995e71842f7f',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      poLineId: 'b71050d3-cf47-45fd-b558-5e39b81d40fd',
      itemId: '4d7a1265-15ae-45c4-862e-29d85c738d29',
      shippedQuantity: '100',
      ciUnitPrice: '200',
      ciValueForeign: '20000',
      ciValueEtb: '20000',
    },
  ]);

  await db.insert(schema.commercialInvoices).values([
    {
      id: 'c22f6c3c-806d-4200-bed0-6b54e53c1f7b',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      invoiceNumber: 'INV-001',
      invoiceDate: '2026-09-28',
      totalForeign: '15000.00',
      totalEtb: '15000.00',
      fxRate: '1',
      currency: 'USD',
    },
    {
      id: '3cfcd072-acad-4a6d-ad92-47b1f336dab9',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      invoiceNumber: 'INV-002',
      invoiceDate: '2026-09-28',
      totalForeign: '20000.00',
      totalEtb: '20000.00',
      fxRate: '1',
      currency: 'USD',
    },
  ]);

  await db.insert(schema.shipmentDocuments).values([
    {
      id: 'ae750e6e-8485-433d-966c-32c84a57b569',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      documentType: 'bl',
      referenceNumber: 'BL-001',
      objectKey: 'bl-1.pdf',
      fileName: 'bl-1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: systemUserId,
    },
    {
      id: '808cd379-61b5-4234-9c31-dabad9d78da8',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      documentType: 'bl',
      referenceNumber: 'BL-002',
      objectKey: 'bl-2.pdf',
      fileName: 'bl-2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      uploadedBy: systemUserId,
    },
  ]);

  // 6. Customs Declarations
  await db.insert(schema.customsDeclarations).values([
    {
      id: '3baf343f-4ef2-473e-8f56-db225bd17c8f',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      declarationNumber: 'DEC-001',
      declarationDate: '2026-09-28',
      status: 'assessed',
      cifValueEtb: '10000.00',
      totalAssessmentEtb: '1000.00',
    },
  ]);

  // 7. Duty payments
  await db.insert(schema.dutyPayments).values([
    {
      id: '7d041bb8-7a55-4871-8343-ee08fbd1e241',
      declarationId: '3baf343f-4ef2-473e-8f56-db225bd17c8f',
      receiptNumber: 'REC-001',
      paymentDate: '2026-09-28',
      amountPaidEtb: '1000.00',
    },
  ]);

  // 8. Cost entries in every category
  await db.insert(schema.importCostEntries).values([
    {
      id: 'f1de9aee-3268-4467-8e6d-bd8f6c24a670',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      costCategoryId: getCatId('FOB'),
      amountForeign: '15000',
      amountEtb: '15000',
      currency: 'USD',
      providerName: 'Supplier',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
    {
      id: '794fb8dc-2b39-47de-bc27-805024093e44',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      costCategoryId: getCatId('FREIGHT'),
      amountForeign: '1000',
      amountEtb: '1000',
      currency: 'USD',
      providerName: 'Shipping Co',
      fxRate: '1',
      allocationMethod: 'by_weight',
      createdBy: systemUserId,
    },
    {
      id: 'fd31a8c1-291a-4358-9fe2-41c402d40bfa',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      costCategoryId: getCatId('INSURANCE'),
      amountForeign: '100',
      amountEtb: '100',
      currency: 'USD',
      providerName: 'Insurer',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
    {
      id: 'aa30b922-aa6d-40b9-acc6-7b5327feae1f',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      costCategoryId: getCatId('CUSTOMS_DUTY'),
      amountForeign: '1000',
      amountEtb: '1000',
      currency: 'ETB',
      providerName: 'Customs',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
    {
      id: '22d6c37c-fc27-400b-9b2b-f322652d87e0',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      costCategoryId: getCatId('EXCISE'),
      amountForeign: '200',
      amountEtb: '200',
      currency: 'ETB',
      providerName: 'Customs',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
    {
      id: 'aaa9273d-36dc-4063-a949-613978a18634',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      costCategoryId: getCatId('CLEARANCE'),
      amountForeign: '500',
      amountEtb: '500',
      currency: 'ETB',
      providerName: 'Agent',
      fxRate: '1',
      allocationMethod: 'by_volume',
      createdBy: systemUserId,
    },
    {
      id: '0d486b78-ad68-49fd-84f6-4dc8e64f0155',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      costCategoryId: getCatId('BANK_CHARGES'),
      amountForeign: '50',
      amountEtb: '50',
      currency: 'ETB',
      providerName: 'Bank',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
    {
      id: '1683042b-5d8f-489d-b6a3-c03037421ea4',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      costCategoryId: getCatId('TRANSPORT'),
      amountForeign: '800',
      amountEtb: '800',
      currency: 'ETB',
      providerName: 'Transporter',
      fxRate: '1',
      allocationMethod: 'by_weight',
      createdBy: systemUserId,
    },
    {
      id: 'bd350f83-d90f-4737-8c86-90ed26de9ee5',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      costCategoryId: getCatId('WAREHOUSING'),
      amountForeign: '300',
      amountEtb: '300',
      currency: 'ETB',
      providerName: 'Warehouse',
      fxRate: '1',
      allocationMethod: 'by_volume',
      createdBy: systemUserId,
    },
    {
      id: '53a84711-0867-4d6c-a85d-cc0100530a99',
      shipmentId: '4ec520e5-85be-4f90-991d-0f39863b6d07',
      costCategoryId: getCatId('OTHER'),
      amountForeign: '150',
      amountEtb: '150',
      currency: 'ETB',
      providerName: 'Misc',
      fxRate: '1',
      allocationMethod: 'by_value',
      createdBy: systemUserId,
    },
  ]);

  // 9. Confirmed GRN
  await db.insert(schema.goodsReceipts).values([
    {
      id: '8fa6faa5-3ed2-464f-906b-d854f0916bff',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      poId: '534bf7e4-1dac-4065-9e54-1b553c42e91c',
      grnNumber: 'GRN-001',
      receiptDate: '2026-09-28',
      status: 'confirmed',
      warehouseLocation: 'WH-Main',
      receivedBy: systemUserId,
    },
  ]);

  await db.insert(schema.goodsReceiptItems).values([
    {
      id: '07940914-fa56-4413-b7f1-0f353cd70943',
      grnId: '8fa6faa5-3ed2-464f-906b-d854f0916bff',
      shipmentItemId: '3f6651f6-c205-4a5c-ae79-995e71842f7f',
      receivedQuantity: '98',
      acceptedQuantity: '95',
      rejectedQuantity: '3',
      perUnitLandedCostEtb: '0.00',
      lineValueEtb: '1000',
    },
  ]);

  // 10. Variances
  await db.insert(schema.costVariances).values([
    {
      id: '805c30bb-22d7-44a0-b73d-30270d25b136',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      varianceType: 'price',
      estimatedEtb: '20000',
      actualEtb: '21000',
      varianceEtb: '1000',
      variancePct: '5.000000',
      comment: 'Supplier raised price',
    },
    {
      id: '8e6d8b95-6ee3-4933-9e06-10889bcc8081',
      shipmentId: '0fd7fe53-62a7-4bbd-9cc1-7d93b248e745',
      varianceType: 'other',
      estimatedEtb: '100',
      actualEtb: '95',
      varianceEtb: '-5',
      variancePct: '-5.000000',
      comment: 'Short shipment',
    },
  ]);
}
