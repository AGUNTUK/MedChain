const fs = require('fs');
let content = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

if (!content.includes('loadStateFromCloud();')) {
  // Put it right after definitions
  content = content.replace(
    'let isProcessing = false;',
    'let isProcessing = false;\n\nloadStateFromCloud();'
  );
  fs.writeFileSync('src/lib/aiEnrichmentService.ts', content);
}
