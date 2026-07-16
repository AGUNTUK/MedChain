import { createClient } from '@supabase/supabase-js';
try {
  const supabase = createClient(undefined, undefined);
} catch (err) {
  console.log("Error:", err.message);
}
