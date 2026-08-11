const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `app.get("/api/products", async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = (search as string) || "";`;

const replacement = `const productCache: Record<string, { data: any, time: number }> = {};

app.get("/api/products", async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = (search as string) || "";
  
  // Simple Cache for popular home screen widgets to prevent heavy DB sorting
  const cacheKey = \`\${filter}_\${category}_\${searchQuery}_\${pageNum}_\${limitNum}\`;
  if (!searchQuery && filter && (filter === "deals" || filter === "frequent")) {
    const cached = productCache[cacheKey];
    if (cached && Date.now() - cached.time < 300000) { // 5 minutes cache
      return res.json(cached.data);
    }
  }`;

code = code.replace(target, replacement);

const target2 = `    if (paginate === "true" || page || limit) {
      const total = count || 0;
      const pages = Math.ceil(total / limitNum);
      return res.json({
        products: mappedProducts,
        total,
        page: pageNum,
        pageSize: limitNum,
        pages,
        suggestions: [], // Server-side search doesn't do suggestions in this simplified query
        originalQuery: searchQuery,
        correctedQuery: undefined
      });
    }

    // Default return for non-paginated requests, although now it respects limit=50 by default
    res.json(mappedProducts);`;

const replacement2 = `    let responseData: any;
    if (paginate === "true" || page || limit) {
      const total = count || 0;
      const pages = Math.ceil(total / limitNum);
      responseData = {
        products: mappedProducts,
        total,
        page: pageNum,
        pageSize: limitNum,
        pages,
        suggestions: [], // Server-side search doesn't do suggestions in this simplified query
        originalQuery: searchQuery,
        correctedQuery: undefined
      };
    } else {
      responseData = mappedProducts;
    }

    if (!searchQuery && filter && (filter === "deals" || filter === "frequent")) {
      productCache[cacheKey] = { data: responseData, time: Date.now() };
    }
    
    return res.json(responseData);`;

code = code.replace(target2, replacement2);
fs.writeFileSync('server.ts', code);
