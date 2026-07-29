const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

// replace hover:text-white with hover:text-slate-900 unless they are inside colored buttons
// the previous regex didn't catch hover:text-white
content = content.replace(/hover:text-white/g, 'hover:text-slate-900');
content = content.replace(/hover:text-slate-200/g, 'hover:text-slate-700');
content = content.replace(/text-slate-200/g, 'text-slate-700'); // if any left
fs.writeFileSync('src/components/AdminPanel.tsx', content);
