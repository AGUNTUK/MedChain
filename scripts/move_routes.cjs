const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

// The AI enrichment routes start at "// --- AI PRODUCT ENRICHMENT ROUTES ---" and end before "const gracefulShutdown"
const routesMatch = content.match(/\/\/ --- AI PRODUCT ENRICHMENT ROUTES ---[\s\S]*?\}\);/g);
if (routesMatch && routesMatch.length > 0) {
  const routesStr = routesMatch[0];
  content = content.replace(routesStr, '');
  
  // Insert it before the Vite setup
  content = content.replace(
    'if (process.env.NODE_ENV !== "production") {',
    routesStr + '\n\n  if (process.env.NODE_ENV !== "production") {'
  );
  
  fs.writeFileSync('server.ts', content);
  console.log("Moved routes");
} else {
  console.log("Not found");
}
