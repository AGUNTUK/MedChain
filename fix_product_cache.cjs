const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'app.get("/api/products", async (req, res) => {',
  'const productCache: Record<string, { data: any, time: number }> = {};\n\napp.get("/api/products", async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
