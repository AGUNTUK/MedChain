const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

server = server.replace(
  'query = query.or(`name.ilike.%${searchQuery}%,generic_name.ilike.%${searchQuery}%`);',
  `// Transform search query for prefix matching in tsvector (e.g., "para" -> "'para':*")
      const formattedSearch = searchQuery.trim().split(/\\s+/).map(w => \`'\${w}':*\`).join(' & ');
      query = query.textSearch('search_vector', formattedSearch);`
);

fs.writeFileSync('server.ts', server);
console.log('Search updated');
