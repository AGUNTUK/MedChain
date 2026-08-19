import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabaseAdmin.js';

async function run() {
  console.log("Zeroing inventory.available_stock...");
  await supabaseAdmin.from('inventory').update({ available_stock: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Zeroing products.stock_quantity...");
  await supabaseAdmin.from('products').update({ stock_quantity: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Zeroing products.availableStock if it exists...");
  await supabaseAdmin.from('products').update({ availableStock: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

  const { data } = await supabaseAdmin.from('products').select('id, name, stock_quantity, availableStock').limit(1);
  console.log("Sample product:", data?.[0]);
}

run().catch(console.error);
