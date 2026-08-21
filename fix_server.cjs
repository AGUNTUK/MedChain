const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.post\("\/api\/admin\/pharmacies\/:id\/credit"[^]+?\}\);\n/g, '');

fs.writeFileSync('server.ts', code);
