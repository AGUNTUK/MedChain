import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
async function test() {
  const res = await supabaseAdmin.from("users").update({ role: "Admin" }).eq("email", "kazisohel199813@gmail.com").select();
  console.log("Users:", res);
}
test().catch(console.error);
