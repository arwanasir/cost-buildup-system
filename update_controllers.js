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
    } else if (file.endsWith('.controller.ts')) {
      results.push(file);
    }
  });
  return results;
}
const controllers = walk('./apps/backend/src');
controllers.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('ApiTags')) {
     let nameMatch = content.match(/export class ([A-Za-z]+)Controller/);
     let name = nameMatch ? nameMatch[1] : 'App';
     
     content = "import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';\n" + content;
     
     content = content.replace(/@Controller\((.*?)\)/, "@ApiTags('" + name + "')\n@ApiBearerAuth()\n@Controller($1)");
     
     fs.writeFileSync(file, content, 'utf8');
  }
});