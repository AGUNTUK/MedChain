const fs = require('fs');

let code = fs.readFileSync('src/components/PWAInstallBanner.tsx', 'utf8');

code = code.replace(/pt-safe/g, 'pt-[env(safe-area-inset-top)]');
code = code.replace(/pb-safe/g, 'pb-[env(safe-area-inset-bottom)]');

fs.writeFileSync('src/components/PWAInstallBanner.tsx', code);
