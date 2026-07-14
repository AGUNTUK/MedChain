const fs = require('fs');
let content = fs.readFileSync('src/db-store.json', 'utf8');
// Hmm, wait, I can just use sed to replace suppliers. But I already messed up.
