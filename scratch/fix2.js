const fs = require('fs');
let content = fs.readFileSync('scratch/generate_demo.js', 'utf8');

// poApprovals: remove them, I don't really need them for report testing, or I can add requiredRole if needed.
// Actually, I'll just change poApprovals to not be there, or add requiredRole
content = content.replace(/poApprovals\)\.values\(\[[\s\S]*?\]\);/, `poApprovals).values([
    { id: '\${poApprovals[0]}', poId: '\${po1}', status: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager' },
    { id: '\${poApprovals[1]}', poId: '\${po2}', status: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager' },
    { id: '\${poApprovals[2]}', poId: '\${po3}', status: 'approved', approverId: systemUserId, requiredRole: 'procurement_manager' }
  ]);`);

// poLines: add lineNo
content = content.replace(/poLines\)\.values\(\[[\s\S]*?\]\);/, `poLines).values([
    { id: '\${poLines[0]}', poId: '\${po1}', itemId: '\${itemIds[0]}', lineNo: 1, quantity: '100', unitPrice: '50', totalLineAmount: '5000', unitOfMeasure: 'PCS' },
    { id: '\${poLines[1]}', poId: '\${po1}', itemId: '\${itemIds[1]}', lineNo: 2, quantity: '200', unitPrice: '50', totalLineAmount: '10000', unitOfMeasure: 'PCS' },
    { id: '\${poLines[2]}', poId: '\${po2}', itemId: '\${itemIds[2]}', lineNo: 1, quantity: '100', unitPrice: '200', totalLineAmount: '20000', unitOfMeasure: 'PCS' },
    { id: '\${poLines[3]}', poId: '\${po3}', itemId: '\${itemIds[3]}', lineNo: 1, quantity: '50', unitPrice: '100', totalLineAmount: '5000', unitOfMeasure: 'PCS' }
  ]);`);

// lettersOfCredit: change lcType to 'sight'
content = content.replace(/lcType: 'irrevocable'/g, `lcType: 'sight'`);

// lcBankCharges: change 'issuance' to 'opening_fee'
content = content.replace(/chargeType: 'issuance'/g, `chargeType: 'opening_fee'`);

fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator 2');
