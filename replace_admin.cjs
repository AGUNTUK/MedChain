const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Add Import
code = code.replace(
  'import AIEnrichmentPanel from "./AIEnrichmentPanel";',
  'import AIEnrichmentPanel from "./AIEnrichmentPanel";\nimport AdminHeroCarouselManager from "./AdminHeroCarouselManager";'
);

// Add Tab
const tabRegex = /<button[\s\S]*?onClick=\{\(\) => setActiveTab\("bulk"\)\}[\s\S]*?Bulk Deals[\s\S]*?<\/button>/;
const matched = code.match(tabRegex);
if(matched) {
  const newTab = `
          <button 
            onClick={() => setActiveTab("carousel")} 
            className={\`px-4 py-2 font-bold text-xs whitespace-nowrap border-b-2 \${activeTab === "carousel" ? "border-brand-purple text-brand-purple" : "border-transparent text-slate-500 hover:text-slate-700"}\`}
          >
            Hero Carousel
          </button>`;
  code = code.replace(tabRegex, matched[0] + newTab);
}

// Add Panel
const panelRegex = /\{activeTab === "bulk" && \([\s\S]*?<\/AdminBulkDealsManager>\s*<\/div>\s*\)\s*\}/;
const matchedPanel = code.match(panelRegex);
if(matchedPanel) {
  const newPanel = `
        {activeTab === "carousel" && (
          <div className="animate-fade-in">
            <AdminHeroCarouselManager />
          </div>
        )}
`;
  code = code.replace(panelRegex, matchedPanel[0] + newPanel);
}

fs.writeFileSync('src/components/AdminPanel.tsx', code);
