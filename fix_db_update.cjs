const fs = require('fs');
let code = fs.readFileSync('src/lib/dbService.ts', 'utf8');

code = code.replace(/\/\/ Automatically create or update credit account with 100k credit limit\s*await supabaseAdmin\s*\.from\("credit_accounts"\)\s*\.upsert\(\{\s*id: `ca_\$\{ph\.id\}`,\s*pharmacy_id: ph\.id,\s*credit_limit: 20000\.00,\s*used_credit: 0\.00\s*\}, \{ onConflict: "pharmacy_id" \};\s*/g, '');

code = code.replace(/\/\/ Automatically create or update credit account\s*await supabaseAdmin\s*\.from\("credit_accounts"\)\s*\.upsert\(\{\s*id: `ca_\$\{pharmacyId\}`,\s*pharmacy_id: pharmacyId,\s*credit_limit: 20000\.00,\s*used_credit: 0\.00\s*\}, \{ onConflict: "pharmacy_id" \};\s*/g, '');

code = code.replace(/export async function adjustPharmacyCredit[^}]+}\s*return \{ error \};\s*}/, '');

code = code.replace(/Your pharmacy verification account has been fully approved! ৳100,000 credit limit is now active\./, 'Your pharmacy verification account has been fully approved! Wholesale purchasing is now active.');

fs.writeFileSync('src/lib/dbService.ts', code);
