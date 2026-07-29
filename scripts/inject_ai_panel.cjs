const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

// 1. Add import
if (!content.includes('AIEnrichmentPanel')) {
  content = content.replace(
    'import ProductEditModal from "./ProductEditModal";',
    'import ProductEditModal from "./ProductEditModal";\nimport AIEnrichmentPanel from "./AIEnrichmentPanel";'
  );
}

// 2. Add route to validRoutes
if (!content.includes('"/admin/ai-enrichment"')) {
  content = content.replace(
    '"/admin/settings"',
    '"/admin/settings",\n        "/admin/ai-enrichment"'
  );
}

// 3. Add to navigation menu
if (!content.includes('navigateTo("/admin/ai-enrichment")')) {
  const menuLink = `
            <button
              onClick={() => navigateTo("/admin/ai-enrichment")}
              className={\`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all \${
                activeRoute === "/admin/ai-enrichment" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }\`}
            >
              <Cpu className="w-4 h-4" />
              <span>AI Enrichment</span>
            </button>
`;
  content = content.replace(
    '<button\n              onClick={() => navigateTo("/admin/settings")}',
    menuLink + '\n            <button\n              onClick={() => navigateTo("/admin/settings")}'
  );
}

// 4. Add header title
if (!content.includes('AI PRODUCT ENRICHMENT ENGINE')) {
  content = content.replace(
    '{activeRoute === "/admin/settings" && "SYSTEM PLATFORM SCHEMAS"}',
    '{activeRoute === "/admin/settings" && "SYSTEM PLATFORM SCHEMAS"}\n              {activeRoute === "/admin/ai-enrichment" && "AI PRODUCT ENRICHMENT ENGINE"}'
  );
}

// 5. Add route renderer
if (!content.includes('<AIEnrichmentPanel />')) {
  const routeContent = `
              {/* SCREEN 8: AI ENRICHMENT */}
              {activeRoute === "/admin/ai-enrichment" && (
                <AIEnrichmentPanel />
              )}
`;
  content = content.replace(
    '{/* SCREEN 7: SYSTEM PLATFORM SCHEMAS */}',
    routeContent + '\n              {/* SCREEN 7: SYSTEM PLATFORM SCHEMAS */}'
  );
}

// Add Cpu import to lucide-react if needed
if (!content.includes('Cpu,')) {
  content = content.replace('Settings,', 'Settings,\n  Cpu,');
}

fs.writeFileSync('src/components/AdminPanel.tsx', content);
console.log('Injected');
