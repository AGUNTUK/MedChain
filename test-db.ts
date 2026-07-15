import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
async function test() {
  const res = await supabaseAdmin.from("users").select("*").limit(1);
  console.log("Users:", res);
}
test().catch(console.error);
