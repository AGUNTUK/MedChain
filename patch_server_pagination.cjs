const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

// /api/orders
const ordersRegex = /app\.get\("\/api\/orders", requireAuth, async \(req, res\) => \{\n  try \{\n    let user = await dbService\.getUserById\(req\.user\.id\)\.catch\(\(\) => null\);\n    if \(!user\) user = req\.user;\n    if \(user\?\.role === "Pharmacy Owner"\) \{\n      const pharmacy = await dbService\.getPharmacyProfile\(req\.user\.id\);\n      if \(!pharmacy\) return res\.json\(\[\]\);\n      const orders = await dbService\.getOrders\(pharmacy\.id\);\n      return res\.json\(orders\);\n    \} else if \(user\?\.role === "Admin" \|\| user\?\.role === "Depot Staff" \|\| user\?\.role === "Delivery Staff"\) \{\n      const orders = await dbService\.getOrders\(\);\n      return res\.json\(orders\);\n    \}\n    res\.json\(\[\]\);\n  \} catch \(err: any\) \{/g;

server = server.replace(ordersRegex, `app.get("/api/orders", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) user = req.user;
    if (user?.role === "Pharmacy Owner") {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      if (!pharmacy) return res.json([]);
      const orders = await dbService.getOrders(pharmacy.id, page, limit);
      return res.json(orders);
    } else if (user?.role === "Admin" || user?.role === "Depot Staff" || user?.role === "Delivery Staff") {
      const orders = await dbService.getOrders(undefined, page, limit);
      return res.json(orders);
    }
    res.json([]);
  } catch (err: any) {`);


// /api/pharmacies is at: `app.get("/api/pharmacies"` or similar? Let's check where it's at.
