const fs = require('fs');
['test/shipment-customs.e2e-spec.ts'].forEach(f => {
  const p = 'apps/backend/' + f;
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/\\\`/g, '\`');
  fs.writeFileSync(p, content);
});
console.log('Fixed backticks.');
