const fs = require('fs');

const indexCss = fs.readFileSync('src/index.css', 'utf-8');

const overrides = `
  --color-blue-50: var(--color-purple-50);
  --color-blue-100: var(--color-purple-100);
  --color-blue-200: var(--color-purple-200);
  --color-blue-300: var(--color-purple-300);
  --color-blue-400: var(--color-purple-400);
  --color-blue-500: var(--color-purple-500);
  --color-blue-600: var(--color-purple-600);
  --color-blue-700: var(--color-purple-700);
  --color-blue-800: var(--color-purple-800);
  --color-blue-900: var(--color-purple-900);
  --color-blue-950: var(--color-purple-950);
`;

const updated = indexCss.replace('@theme {', '@theme {' + overrides);
fs.writeFileSync('src/index.css', updated);
console.log('Updated index.css again');
