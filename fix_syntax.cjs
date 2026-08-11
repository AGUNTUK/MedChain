const fs = require('fs');
let code = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');
code = code.replace('    ););', '    );');
fs.writeFileSync('src/lib/aiEnrichmentService.ts', code);
console.log('Fixed syntax');
