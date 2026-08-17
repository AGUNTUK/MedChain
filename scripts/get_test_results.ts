import 'dotenv/config';
import { supabaseAdmin } from '../src/lib/supabaseAdmin.js';
import { aiEnrichmentService } from '../src/lib/aiEnrichmentService.js';

async function run() {
  const state = await aiEnrichmentService.getState();
  console.log("=== LATEST LOGS ===");
  console.log(JSON.stringify(state.logs.slice(0, 5), null, 2));
  
  const { data: updated } = await supabaseAdmin.from('products').select('id, name, mrp, selling_price, image_url').in('name', ['Napa', 'Seclo', 'Maxpro']).limit(5);
  console.log("=== DB STATE ===");
  console.log(JSON.stringify(updated, null, 2));
}

run().catch(console.error);
