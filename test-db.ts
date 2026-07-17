import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
import { getProductsRaw } from "./src/lib/dbService.js";

async function test() {
  const { count, error } = await supabaseAdmin.from("products").select("*", { count: "exact", head: true });
  console.log("Total count in DB products table:", count, "Error:", error);

  const rawProducts = await getProductsRaw();
  console.log("Count returned by getProductsRaw():", rawProducts.length);
}
test().catch(console.error);
