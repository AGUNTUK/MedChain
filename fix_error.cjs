const fs = require('fs');
let code = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');
code = code.replace(
  '        timeout: 30000\n      }\n    );',
  '        timeout: 30000\n      }\n    ));'
);
fs.writeFileSync('src/lib/aiEnrichmentService.ts', code);
console.log('Fixed parenthesis error');
