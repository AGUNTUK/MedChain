import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
async function test() {
  const res = await supabaseAdmin.from("users").select("*").eq("email", "kazisohel199813@gmail.com");
  console.log("Users:", res);
}
test().catch(console.error);
