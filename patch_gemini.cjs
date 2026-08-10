const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf-8');

const retryLogic = `
async function runWithRetry(fn, maxAttempts = 3, timeoutMs = 15000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs))
      ]);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, backoff));
    }
  }
}
`;

server = server.replace('const app = express();', retryLogic + '\nconst app = express();');

fs.writeFileSync('server.ts', server);
console.log('Added retry logic');
