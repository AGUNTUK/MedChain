const fs = require('fs');
let code = fs.readFileSync('src/lib/dbService.ts', 'utf8');

code = code.replace(/const pharmacyIds = list\.map\(\(ph: any\) => ph\.id\);\s*const \{ data: crList \} = await supabaseAdmin\s*\.from\("credit_accounts"\)\s*\.select\("pharmacy_id, credit_limit, used_credit, available_credit"\)\s*\.in\("pharmacy_id", pharmacyIds\);\s*const crMap = new Map\(\);\s*if \(crList\) \{\s*crList\.forEach\(\(cr: any\) => \{\s*crMap\.set\(cr\.pharmacy_id, cr\);\s*\}\);\s*\}\s*const out: Pharmacy\[\] = \[\];\s*for \(const ph of list\) \{\s*const cr = crMap\.get\(ph\.id\);\s*const license = deserializeLicenseInfo\(ph\.license_information\);\s*out\.push\(\{([^}]*?),(\s*)creditLimit: [^,]+,\s*usedCredit: [^,]+,\s*availableCredit: [^\n]+\n\s*\}\);\s*\}/g, 
`const out: Pharmacy[] = [];
  for (const ph of list) {
    const license = deserializeLicenseInfo(ph.license_information);
    out.push({$1
    });
  }`);
fs.writeFileSync('src/lib/dbService.ts', code);
