const fs = require('fs');
let content = fs.readFileSync('src/lib/aiEnrichmentService.ts', 'utf-8');

content = content.replace(
  'const OPENROUTER_MODELS = [\n  "qwen/qwen-2.5-72b-instruct:free",\n  "qwen/qwen-2.5-coder-32b-instruct:free",\n  "nvidia/llama-3.1-nemotron-70b-instruct:free",\n  "openrouter/auto"\n];',
  'const OPENROUTER_MODELS = [\n  "qwen/qwen3-30b-a3b:free",\n  "qwen/qwen-2.5-72b-instruct:free",\n  "openrouter/free"\n];'
);

fs.writeFileSync('src/lib/aiEnrichmentService.ts', content);
