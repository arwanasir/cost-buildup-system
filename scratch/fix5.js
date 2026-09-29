const fs = require('fs');
let content = fs.readFileSync('scratch/generate_demo.js', 'utf8');

// fix suppliers
content = content.replace(/code: 'SUP-DEMO'/g, "supplierCode: 'SUP-DEMO'");

// fix suppliersBankAccounts
content = content.replace(/accountNumber: '123456789'/g, "ibanOrAccount: '123456789'");
content = content.replace(/accountNumber: '987654321'/g, "ibanOrAccount: '987654321'");
content = content.replace(/swiftCode:/g, "swift:");
content = content.replace(/isPrimary:/g, "isDefault:");
content = content.replace(/,\s*status: 'active'/g, "");

// fix importShipments
content = content.replace(/estimatedArrival:/g, "eta:");
content = content.replace(/actualArrival:/g, "actualArrivalDate:");

fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator 5');
