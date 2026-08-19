import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabaseAdmin.js';

async function run() {
  console.log("Zeroing inventory.available_stock...");
  const { data: invData, error: invError } = await supabaseAdmin.from('inventory').update({ available_stock: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(invError || "Inventory updated");

  console.log("Zeroing products.stock_quantity if it exists...");
  const { error: prodError } = await supabaseAdmin.from('products').update({ stock_quantity: '0' }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(prodError || "Products updated");
}

run().catch(console.error);
