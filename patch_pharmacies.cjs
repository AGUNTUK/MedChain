const fs = require('fs');
let code = fs.readFileSync('src/lib/dbService.ts', 'utf-8');

const target = `export async function getAllPharmacies(): Promise<Pharmacy[]> {
  const { data: list } = await supabaseAdmin
    .from("pharmacies")
    .select("*");

  if (!list) return [];

  const out: Pharmacy[] = [];
  for (const ph of list) {
    const { data: cr } = await supabaseAdmin
      .from("credit_accounts")
      .select("*")
      .eq("pharmacy_id", ph.id)
      .maybeSingle();

    const license = deserializeLicenseInfo(ph.license_information);

    out.push({
      id: ph.id,
      pharmacyName: ph.pharmacy_name,
      ownerName: ph.owner_name,
      phone: ph.phone,
      address: ph.address,
      city: ph.city,
      area: ph.city,
      ...license,
      licenseNo: license.licenseNo,
      verificationStatus: license.verificationStatus as any,
      verificationNotes: "",
      creditLimit: cr ? parseFloat(cr.credit_limit) : 100000,
      usedCredit: cr ? parseFloat(cr.used_credit) : 0,
      availableCredit: cr ? parseFloat(cr.available_credit) : 100000
    });
  }
  return out;
}`;

const replacement = `export async function getAllPharmacies(): Promise<Pharmacy[]> {
  const { data: list } = await supabaseAdmin
    .from("pharmacies")
    .select("*");

  if (!list || list.length === 0) return [];
  
  const pharmacyIds = list.map((ph: any) => ph.id);
  
  const { data: crList } = await supabaseAdmin
    .from("credit_accounts")
    .select("*")
    .in("pharmacy_id", pharmacyIds);
    
  const crMap = new Map();
  if (crList) {
    crList.forEach((cr: any) => {
      crMap.set(cr.pharmacy_id, cr);
    });
  }

  const out: Pharmacy[] = [];
  for (const ph of list) {
    const cr = crMap.get(ph.id);

    const license = deserializeLicenseInfo(ph.license_information);

    out.push({
      id: ph.id,
      pharmacyName: ph.pharmacy_name,
      ownerName: ph.owner_name,
      phone: ph.phone,
      address: ph.address,
      city: ph.city,
      area: ph.city,
      ...license,
      licenseNo: license.licenseNo,
      verificationStatus: license.verificationStatus as any,
      verificationNotes: "",
      creditLimit: cr ? parseFloat(cr.credit_limit) : 100000,
      usedCredit: cr ? parseFloat(cr.used_credit) : 0,
      availableCredit: cr ? parseFloat(cr.available_credit) : 100000
    });
  }
  return out;
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/dbService.ts', code);
