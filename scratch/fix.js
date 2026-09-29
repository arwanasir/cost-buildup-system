const fs = require('fs');

let content = fs.readFileSync('scratch/generate_demo.js', 'utf8');

content = content.replace(/importShipments\)\.values\(\[\s+\{\s*id: '\$\{shipment1\}', shipmentNumber: 'SHP-DEMO-001', poId: '\$\{po1\}', supplierId: '\$\{supplierId\}', status: 'in_transit', originPort: 'Shanghai', destinationPort: 'Djibouti', estimatedArrival: '\$\{dateStr\}'\s*\},[\s\S]*?\]\);/, `importShipments).values([
    { id: '\${shipment1}', shipmentNumber: 'SHP-DEMO-001', poId: '\${po1}', supplierId: '\${supplierId}', status: 'in_transit', portOfLoading: 'Shanghai', portOfDestination: 'Djibouti', estimatedArrival: '\${dateStr}' },
    { id: '\${shipment2}', shipmentNumber: 'SHP-DEMO-002', poId: '\${po2}', supplierId: '\${supplierId}', status: 'arrived', portOfLoading: 'Shenzhen', portOfDestination: 'Djibouti', actualArrival: '\${dateStr}' }
  ]);`);

content = content.replace(/lettersOfCredit\)\.values\(\[[\s\S]*?\]\);/, `lettersOfCredit).values([
    {
      id: '\${lc1}',
      supplierId: '\${supplierId}',
      lcNumber: 'LC-DEMO-001',
      issuingBank: 'Bank of Demo',
      amountForeign: '15000.00',
      currency: 'USD',
      fxRate: '1',
      amountEtb: '15000.00',
      openingDate: '\${dateStr}',
      expiryDate: '2027-12-31',
      status: 'opened',
      lcType: 'irrevocable'
    }
  ]);`);

content = content.replace(/lcBankCharges\)\.values\(\[[\s\S]*?\]\);/, `lcBankCharges).values([
    { id: '\${uuid()}', lcId: '\${lc1}', chargeType: 'issuance', amountEtb: '150.00', chargeDate: '\${dateStr}' },
    { id: '\${uuid()}', lcId: '\${lc1}', chargeType: 'swift', amountEtb: '25.00', chargeDate: '\${dateStr}' }
  ]);`);

content = content.replace(/importCostEntries\)\.values\(\[[\s\S]*?\]\);/, `importCostEntries).values([
    { id: '\${uuid()}', shipmentId: '\${shipment1}', costCategoryId: getCatId('FOB'), amountForeign: '15000', amountEtb: '15000', currency: 'USD', providerName: 'Supplier', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment1}', costCategoryId: getCatId('FREIGHT'), amountForeign: '1000', amountEtb: '1000', currency: 'USD', providerName: 'Shipping Co', fxRate: '1', allocationMethod: 'by_weight', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment1}', costCategoryId: getCatId('INSURANCE'), amountForeign: '100', amountEtb: '100', currency: 'USD', providerName: 'Insurer', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment2}', costCategoryId: getCatId('CUSTOMS_DUTY'), amountForeign: '1000', amountEtb: '1000', currency: 'ETB', providerName: 'Customs', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment2}', costCategoryId: getCatId('EXCISE'), amountForeign: '200', amountEtb: '200', currency: 'ETB', providerName: 'Customs', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment2}', costCategoryId: getCatId('CLEARANCE'), amountForeign: '500', amountEtb: '500', currency: 'ETB', providerName: 'Agent', fxRate: '1', allocationMethod: 'by_volume', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment1}', costCategoryId: getCatId('BANK_CHARGES'), amountForeign: '50', amountEtb: '50', currency: 'ETB', providerName: 'Bank', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment2}', costCategoryId: getCatId('TRANSPORT'), amountForeign: '800', amountEtb: '800', currency: 'ETB', providerName: 'Transporter', fxRate: '1', allocationMethod: 'by_weight', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment2}', costCategoryId: getCatId('WAREHOUSING'), amountForeign: '300', amountEtb: '300', currency: 'ETB', providerName: 'Warehouse', fxRate: '1', allocationMethod: 'by_volume', createdBy: systemUserId },
    { id: '\${uuid()}', shipmentId: '\${shipment1}', costCategoryId: getCatId('OTHER'), amountForeign: '150', amountEtb: '150', currency: 'ETB', providerName: 'Misc', fxRate: '1', allocationMethod: 'by_value', createdBy: systemUserId },
  ]);`);

fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator');
