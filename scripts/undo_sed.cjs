const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

// The replacement was: s/"\/admin\/settings"/"\/admin\/settings", "\/admin\/ai-enrichment"/g
// So I will just revert exactly those back to "/admin/settings"
content = content.replace(/"\/admin\/settings", "\/admin\/ai-enrichment"/g, '"/admin/settings"');

// And then manually fix the ones that actually needed fixing
// 1. The union type:
content = content.replace(
  '"/admin/settings" | "/admin/ai-enrichment"',
  '"/admin/settings" | "/admin/ai-enrichment"'
);

// 2. The validRoutes array:
content = content.replace(
  '        "/admin/settings"\n      ];',
  '        "/admin/settings",\n        "/admin/ai-enrichment"\n      ];'
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
