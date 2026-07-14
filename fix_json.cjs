const fs = require('fs');
let lines = fs.readFileSync('src/db-store.json', 'utf8').split('\n');
for (let i = 0; i < lines.length - 1; i++) {
  let line = lines[i];
  let nextLine = lines[i + 1].trim();
  if (line.trim() !== '' && !line.endsWith('{') && !line.endsWith('[')) {
    if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith(']')) {
      if (!line.endsWith(',')) {
        lines[i] = line + ',';
      }
    }
  }
}
fs.writeFileSync('src/db-store.json', lines.join('\n'));
