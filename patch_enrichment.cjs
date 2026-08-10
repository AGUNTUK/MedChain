const fs = require('fs');
let code = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

const regex = /const response = await axios\.post\([\s\S]*?\}\s*\);/;

code = code.replace(regex, (match) => {
  return `
    const response = await runWithRetry(() => ${match.replace('await ', '').replace('const response = ', '')});
  `.trim();
});

fs.writeFileSync('src/lib/aiEnrichmentService.ts', code);
console.log('Patched callOpenRouter');
