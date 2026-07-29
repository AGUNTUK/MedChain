const fs = require('fs');
let content = fs.readFileSync('src/components/AIEnrichmentPanel.tsx', 'utf-8');

if (!content.includes('state.memoryUsage')) {
  content = content.replace(
    '<div className="w-px h-8 bg-slate-800 hidden sm:block"></div>\n          <div className="px-4 py-2 flex flex-col">',
    `<div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
          <div className="px-4 py-2 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Memory</span>
            <span className="text-sm font-bold text-slate-300">{state.memoryUsage}</span>
          </div>
          <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
          <div className="px-4 py-2 flex flex-col">`
  );
  fs.writeFileSync('src/components/AIEnrichmentPanel.tsx', content);
}
