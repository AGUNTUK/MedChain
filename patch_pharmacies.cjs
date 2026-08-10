const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
  /app\.get\("\/api\/admin\/pharmacies", requireRole\(\["Admin"\]\), async \(req, res\) => \{\n  try \{\n    const list = await dbService\.getAllPharmacies\(\);\n    res\.json\(\{ pharmacies: list \}\);\n  \} catch \(err: any\) \{/g,
  `app.get("/api/admin/pharmacies", requireRole(["Admin"]), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  try {
    const list = await dbService.getAllPharmacies(page, limit);
    res.json({ pharmacies: list });
  } catch (err: any) {`
);

fs.writeFileSync('server.ts', server);
console.log('Patched pharmacies route');
