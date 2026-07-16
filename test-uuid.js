import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('pharmacies').select('*').eq('user_id', 'local-usr-123').maybeSingle();
  console.log("Data:", data, "Error:", error);
}
run();
