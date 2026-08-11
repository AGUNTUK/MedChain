const fs = require('fs');
let content = fs.readFileSync('src/components/AIEnrichmentPanel.tsx', 'utf-8');

// The inputs have text-white. We should change to text-slate-900 globally, 
// then restore text-white for the action buttons.
content = content.replace(/text-white/g, 'text-slate-900');
content = content.replace(/bg-indigo-600([^>]+)text-slate-900/g, 'bg-indigo-600$1text-white');
content = content.replace(/bg-amber-600([^>]+)text-slate-900/g, 'bg-amber-600$1text-white');
content = content.replace(/bg-emerald-600([^>]+)text-slate-900/g, 'bg-emerald-600$1text-white');

fs.writeFileSync('src/components/AIEnrichmentPanel.tsx', content);
