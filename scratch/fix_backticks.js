const fs = require('fs');
['src/db/seed/seed.ts', 'test/auth.e2e-spec.ts', 'test/procurement.e2e-spec.ts'].forEach(f => {
  const p = 'apps/backend/' + f;
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/\\\`/g, '\`');
  fs.writeFileSync(p, content);
});
console.log('Fixed backticks.');
