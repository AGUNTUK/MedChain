const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target1 = `  const searchQuery = (search as string) || "";

  try {`;

const repl1 = `  const searchQuery = (search as string) || "";
  const cacheKey = \`\${filter}_\${category}_\${searchQuery}_\${pageNum}_\${limitNum}\`;

  try {
    if (!searchQuery && filter && (filter === "deals" || filter === "frequent")) {
      const cached = productCache[cacheKey];
      if (cached && Date.now() - cached.time < 300000) { // 5 minutes cache
        return res.json(cached.data);
      }
    }`;

code = code.replace(target1, repl1);

fs.writeFileSync('server.ts', code);
