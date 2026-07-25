const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const target = `app.get("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("products").select("category_name_fallback");
    if (error) throw error;
    const categories = Array.from(new Set(data.map((p: any) => p.category_name_fallback).filter(Boolean)));
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});`;

const replacement = `let cachedCategories: string[] | null = null;
let lastCategoryFetch = 0;

app.get("/api/categories", async (req, res) => {
  try {
    if (cachedCategories && Date.now() - lastCategoryFetch < 3600000) {
      return res.json(cachedCategories);
    }
    
    // First try getting from categories table directly
    const { data: catData, error: catErr } = await supabaseAdmin.from("categories").select("name");
    
    let categories = [];
    if (!catErr && catData && catData.length > 0) {
       categories = catData.map((c: any) => c.name);
    } else {
       // Fallback to distinct
       const { data, error } = await supabaseAdmin.from("products").select("category_name_fallback");
       if (error) throw error;
       categories = Array.from(new Set(data.map((p: any) => p.category_name_fallback).filter(Boolean)));
    }
    
    cachedCategories = categories;
    lastCategoryFetch = Date.now();
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    if (cachedCategories) return res.json(cachedCategories);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});`;

code = code.replace(target, replacement);
fs.writeFileSync('server.ts', code);
