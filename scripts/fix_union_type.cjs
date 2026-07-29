const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');
content = content.replace('"/admin/settings",\n        "/admin/ai-enrichment"', '"/admin/settings" | "/admin/ai-enrichment"');
fs.writeFileSync('src/components/AdminPanel.tsx', content);
