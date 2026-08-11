const fs = require('fs');
const filePath = 'server.ts';
let code = fs.readFileSync(filePath, 'utf8');

const target = `    if (searchQuery) {
      // Transform search query for prefix matching in tsvector (e.g., "para" -> "'para':*")
      const formattedSearch = searchQuery.trim().split(/\\s+/).map(w => \`'\${w}':*\`).join(' & ');
      query = query.textSearch('search_vector', formattedSearch);
    }`;

const replacement = `    if (searchQuery) {
      const searchTerms = searchQuery.trim().split(/\\s+/);
      searchTerms.forEach(term => {
        query = query.or(\`name.ilike.%$\{term}%,generic_name.ilike.%$\{term}%,company.ilike.%$\{term}%\`);
      });
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(filePath, code);
  console.log('Successfully patched server.ts');
} else {
  console.log('Target string not found in server.ts');
}
