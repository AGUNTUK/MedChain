const fs = require('fs');
let dbService = fs.readFileSync('src/lib/dbService.ts', 'utf-8');

// getAllPharmacies
dbService = dbService.replace(
  'export async function getAllPharmacies(): Promise<Pharmacy[]> {',
  'export async function getAllPharmacies(page = 1, limit = 100): Promise<Pharmacy[]> {\n  const offset = (page - 1) * limit;'
);

dbService = dbService.replace(
  '.select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information");',
  '.select("id, user_id, pharmacy_name, owner_name, phone, address, city, license_information").range(offset, offset + limit - 1);'
);

// getOrders
dbService = dbService.replace(
  'export async function getOrders(pharmacyId?: string): Promise<Order[]> {',
  'export async function getOrders(pharmacyId?: string, page = 1, limit = 100): Promise<Order[]> {\n  const offset = (page - 1) * limit;'
);

dbService = dbService.replace(
  'const { data, error } = await query.order("created_at", { ascending: false }).limit(100);',
  'const { data, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);'
);

fs.writeFileSync('src/lib/dbService.ts', dbService);
console.log('Patched dbService for pagination');
