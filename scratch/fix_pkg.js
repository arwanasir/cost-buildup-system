const fs = require('fs');
let pkgStr = fs.readFileSync('apps/backend/package.json', 'utf8');

// The string was messed up, let me just parse it if it's valid JSON
try {
  let pkg = JSON.parse(pkgStr);
  
  // Clean up any weird keys that got created by the bad powershell replace
  for (let key of Object.keys(pkg.scripts)) {
    if (key.includes('\`n')) {
      delete pkg.scripts[key];
    }
    if (key.includes('db:seed`n')) {
        delete pkg.scripts[key];
    }
  }

  // Restore the correct keys
  pkg.scripts['db:seed'] = 'ts-node src/db/seed/seed.ts';
  pkg.scripts['db:seed:demo'] = 'ts-node src/db/seed/seed.ts demo';
  pkg.scripts['db:seed:perf'] = 'ts-node src/db/seed/seed.ts perf';

  fs.writeFileSync('apps/backend/package.json', JSON.stringify(pkg, null, 2));
  console.log('Fixed package.json');
} catch(e) {
  console.log('JSON Parse failed. Fixing manually');
  pkgStr = pkgStr.replace(/"db:seed": "ts-node src\/db\/seed\/seed\.ts",`n.*/, '"db:seed": "ts-node src/db/seed/seed.ts",\n    "db:seed:demo": "ts-node src/db/seed/seed.ts demo",\n    "db:seed:perf": "ts-node src/db/seed/seed.ts perf",');
  fs.writeFileSync('apps/backend/package.json', pkgStr);
}
