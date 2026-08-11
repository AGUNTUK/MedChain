const fs = require('fs');

function replaceColors(filename) {
  let content = fs.readFileSync(filename, 'utf-8');
  content = content.replace(/bg-slate-900 text-slate-100/g, 'bg-slate-50 text-slate-900');
  content = content.replace(/bg-slate-950 border-r/g, 'bg-white border-r');
  content = content.replace(/bg-slate-950 border-b/g, 'bg-white border-b');
  content = content.replace(/bg-slate-950\/40/g, 'bg-white/40');
  content = content.replace(/bg-slate-950\/60/g, 'bg-white/60');
  content = content.replace(/bg-slate-950\/20/g, 'bg-white/20');
  content = content.replace(/bg-slate-950/g, 'bg-white');

  content = content.replace(/bg-slate-900\/50/g, 'bg-slate-50/50');
  content = content.replace(/bg-slate-900/g, 'bg-slate-50');
  
  content = content.replace(/bg-slate-800\/50/g, 'bg-slate-200/50');
  content = content.replace(/bg-slate-800/g, 'bg-slate-200');
  
  content = content.replace(/border-slate-800/g, 'border-slate-200');

  // protect specific instances
  content = content.replace(/bg-indigo-600 text-white/g, 'BG_INDIGO_600_TEXT_WHITE');
  content = content.replace(/bg-emerald-600 text-white/g, 'BG_EMERALD_600_TEXT_WHITE');
  content = content.replace(/bg-amber-600 text-white/g, 'BG_AMBER_600_TEXT_WHITE');
  content = content.replace(/bg-rose-600 text-white/g, 'BG_ROSE_600_TEXT_WHITE');
  
  content = content.replace(/text-white/g, 'text-slate-900');
  
  content = content.replace(/BG_INDIGO_600_TEXT_WHITE/g, 'bg-indigo-600 text-white');
  content = content.replace(/BG_EMERALD_600_TEXT_WHITE/g, 'bg-emerald-600 text-white');
  content = content.replace(/BG_AMBER_600_TEXT_WHITE/g, 'bg-amber-600 text-white');
  content = content.replace(/BG_ROSE_600_TEXT_WHITE/g, 'bg-rose-600 text-white');

  content = content.replace(/text-slate-100/g, 'text-slate-900');
  content = content.replace(/text-slate-300/g, 'text-slate-700');
  content = content.replace(/text-slate-400/g, 'text-slate-500');

  fs.writeFileSync(filename, content);
}

replaceColors('src/components/AIEnrichmentPanel.tsx');

