const fs = require('fs');
let content = fs.readFileSync('scratch/generate_demo.js', 'utf8');

// fix suppliers
content = content.replace(/countryOfOrigin/g, "country");

fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator 6');
