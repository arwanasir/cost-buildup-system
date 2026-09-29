const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.dto.ts')) {
      results.push(file);
    }
  });
  return results;
}
const dtos = walk('./apps/backend/src');
dtos.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  const lines = content.split('\n');
  let newLines = [];
  for(let i = 0; i < lines.length; i++) {
     const line = lines[i];
     if (line.match(/^\s+(readonly\s+)?[a-zA-Z0-9_]+[?!]?\s*:\s*.*?;/)) {
        if (!newLines[newLines.length - 1].includes('@ApiProperty')) {
           const spaces = line.match(/^\s+/)[0];
           newLines.push(spaces + '@ApiProperty()');
        }
     }
     newLines.push(line);
  }
  
  let newContent = newLines.join('\n');
  if (!newContent.includes('import { ApiProperty }')) {
     newContent = "import { ApiProperty } from '@nestjs/swagger';\n" + newContent;
  }
  
  fs.writeFileSync(file, newContent, 'utf8');
});