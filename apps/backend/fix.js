const fs = require('fs');
let content = fs.readFileSync('src/erp-sync/inventory-posting.service.ts', 'utf8');
content = content.replace(/throw new Error\([\s\S]*not found[\s\S]*\);/g, "throw new Error( + "" + GRN \ not found + "" + );");
fs.writeFileSync('src/erp-sync/inventory-posting.service.ts', content);