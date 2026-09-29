const fs = require('fs');
let pkgStr = fs.readFileSync('apps/backend/package.json', 'utf8');
let pkg = JSON.parse(pkgStr);
pkg.jest.coverageThreshold = {
  global: {
    statements: 80,
    branches: 70
  }
};
fs.writeFileSync('apps/backend/package.json', JSON.stringify(pkg, null, 2));
console.log('Fixed package.json');
