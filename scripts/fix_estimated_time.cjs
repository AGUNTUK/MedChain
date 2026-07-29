const fs = require('fs');
let content = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

if (!content.includes('estimatedRemainingTime: number;')) {
  content = content.replace(
    'memoryUsage: string;',
    'memoryUsage: string;\n  estimatedRemainingTime: number;'
  );
  content = content.replace(
    'memoryUsage: "0 MB",',
    'memoryUsage: "0 MB",\n  estimatedRemainingTime: 0,'
  );
  fs.writeFileSync('src/lib/aiEnrichmentService.ts', content);
}
