const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');
content = content.replace(/bg-slate-50 text-white/g, 'bg-slate-50 text-slate-900');
fs.writeFileSync('src/components/AdminPanel.tsx', content);
