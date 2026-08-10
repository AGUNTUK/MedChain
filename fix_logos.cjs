const fs = require('fs');
const files = [
  'src/components/AdminPanel.tsx',
  'src/components/DeliveryDashboard.tsx',
  'src/components/DepotDashboard.tsx',
  'src/components/PWAInstallBanner.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('import { MediChainIconOnly }')) continue;
  
  // Add import
  content = content.replace(
    /import React(.*?)(?:;|\n)/,
    "import React$1;\nimport { MediChainIconOnly } from './MediChainLogo';"
  );
  
  // Replace <img src="/logo.png" ... className="w-7 h-7 object-contain" />
  content = content.replace(
    /<img src="\/logo\.png" alt="MediChain Logo" className="([^"]+)" \/>/g,
    '<MediChainIconOnly className="$1" />'
  );
  
  fs.writeFileSync(file, content);
}
console.log('Fixed logos');
