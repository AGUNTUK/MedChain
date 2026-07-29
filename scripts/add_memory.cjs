const fs = require('fs');
let content = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

if (!content.includes('memoryUsage')) {
  content = content.replace(
    'currentAiModel: string;',
    'currentAiModel: string;\n  memoryUsage: string;'
  );
  content = content.replace(
    'currentAiModel: "-",',
    'currentAiModel: "-",\n  memoryUsage: "0 MB",'
  );
  content = content.replace(
    'getState() {',
    'getState() {\n    const mem = process.memoryUsage();\n    state.memoryUsage = `${Math.round(mem.rss / 1024 / 1024)} MB (RSS)`;'
  );
  fs.writeFileSync('src/lib/aiEnrichmentService.ts', content);
}
