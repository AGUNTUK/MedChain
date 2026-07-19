import { supabaseAdmin } from "./src/lib/supabaseAdmin";

async function getCategoryIds() {
  try {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*");
    
    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }
    
    console.log("Categories found:", data);
    console.log("Total count:", data.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

getCategoryIds();
