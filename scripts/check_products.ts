import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabaseAdmin.js';

async function run() {
  const { data, error } = await supabaseAdmin.from('products').select('*').limit(1);
  console.log(JSON.stringify(data?.[0], null, 2));
}

run().catch(console.error);
