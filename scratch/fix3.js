const fs = require('fs');
let content = fs.readFileSync('scratch/generate_demo.js', 'utf8');

content = content.replace(/status: 'in_transit'/g, "status: 'shipped'");
content = content.replace(/status: 'arrived'/g, "status: 'received'");

fs.writeFileSync('scratch/generate_demo.js', content);
console.log('Fixed generator 3');
