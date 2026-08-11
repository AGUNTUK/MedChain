const fs = require('fs');
function fix(filename) {
  let content = fs.readFileSync(filename, 'utf-8');
  content = content.replace(/bg-([a-z]+)-([0-9]+)([\w\s:-]*)text-slate-900/g, 'bg-$1-$2$3text-white');
  fs.writeFileSync(filename, content);
}
fix('src/components/AdminPanel.tsx');
fix('src/components/AIEnrichmentPanel.tsx');
