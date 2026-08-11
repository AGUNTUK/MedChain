const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

code = code.replace(
  "workbox: {",
  "workbox: {\n          maximumFileSizeToCacheInBytes: 5000000,"
);

fs.writeFileSync('vite.config.ts', code);
