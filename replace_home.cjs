const fs = require('fs');
let code = fs.readFileSync('src/components/Home.tsx', 'utf8');

// 1. Add HeroCarousel import
code = code.replace(
  'import PrescriptionScanner from "./PrescriptionScanner";',
  'import PrescriptionScanner from "./PrescriptionScanner";\nimport HeroCarousel from "./HeroCarousel";'
);

// 2. Remove the "Logged Pharmacy" block in the header
const headerBlock = `<div>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Logged Pharmacy</span>
            <h1 className="text-xs font-black text-brand-charcoal truncate max-w-[160px] leading-tight">
              {pharmacyName}
            </h1>
          </div>`;
code = code.replace(headerBlock, '');

// 3. Remove the B2B Today's Promotional Banner block entirely
const bannerStart = `{/* B2B Today's Promotional Banner */}`;
const bannerEndRegex = /{!liveCampaign && \([\s\S]*?<\/div>\s*\)\s*}/;
const firstPart = code.split(bannerStart)[0];
let secondPart = code.split(bannerStart)[1];
secondPart = secondPart.replace(bannerEndRegex, ''); // remove the !liveCampaign block
const endOfFirstBannerRegex = /{\s*liveCampaign && \([\s\S]*?<\/div>\s*\)\s*}/;
secondPart = secondPart.replace(endOfFirstBannerRegex, ''); // remove the liveCampaign block

code = firstPart + secondPart;

// 4. Inject the HeroCarousel at the top of Main Body, outside the p-4 padding if possible, or inside it. 
// The Carousel looks better full width.
const mainBodyStart = `{/* Main Body */}`;
const injection = `{/* Main Body */}\n      <HeroCarousel pharmacyName={pharmacyName} onOpenScanner={() => setIsScannerOpen(true)} onBrowseCatalog={() => onTriggerSearch()} onOpenBulkDeals={onOpenBulkDeals} />`;
code = code.replace(mainBodyStart, injection);

fs.writeFileSync('src/components/Home.tsx', code);
