const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// Clean up weird stray bracket around line 60-70
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('} catch (err) {') && lines[i-1].trim() === '}') {
      if (lines[i-2] && lines[i-2].includes('};')) {
          lines[i-1] = '';
          lines[i] = '';
          lines[i+1] = '';
          lines[i+2] = '';
      }
  }
}
fs.writeFileSync('src/App.tsx', lines.join('\n'));
