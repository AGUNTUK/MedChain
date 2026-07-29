const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

if (content.includes('await performSearch(item.name, { limit: 1 });')) {
  content = content.replace(
    'const matchedProducts = [];',
    `const { data: dbProducts } = await dbService.supabaseAdmin.from("products").select("*");
    const matchedProducts = [];`
  );
  content = content.replace(
    'const results = await performSearch(item.name, { limit: 1 });',
    'const results = performSearch(dbProducts || [], item.name, { limit: 1 });'
  );
  fs.writeFileSync('server.ts', content);
}
