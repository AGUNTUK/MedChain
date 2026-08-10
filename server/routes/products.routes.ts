import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";
import { performSearch } from "../../src/lib/searchService.js";
import { requireAuth, requireVerifiedPharmacy } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Server-side category cache (1h TTL)
// ---------------------------------------------------------------------------

let cachedCategories: string[] | null = null;
let lastCategoryFetch = 0;

// ---------------------------------------------------------------------------
// Server-side product page cache (60s TTL)
// ---------------------------------------------------------------------------

const productCache: Record<string, { data: any; time: number }> = {};

// ---------------------------------------------------------------------------
// Retry helper (used by Gemini scan)
// ---------------------------------------------------------------------------

async function runWithRetry(fn: () => Promise<any>, maxAttempts = 3, timeoutMs = 15000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI Request Timeout")), timeoutMs))
      ]);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, backoff));
    }
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.get("/categories", async (req, res) => {
  try {
    if (cachedCategories && Date.now() - lastCategoryFetch < 3600000) {
      return res.json(cachedCategories);
    }

    const { data: catData, error: catErr } = await supabaseAdmin.from("categories").select("name");

    let categories = [];
    if (!catErr && catData && catData.length > 0) {
      categories = catData.map((c: any) => c.name);
    } else {
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
});

router.get("/products", async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = (search as string) || "";
  const cacheKey = `${filter}_${category}_${searchQuery}_${pageNum}_${limitNum}`;

  try {
    const cached = productCache[cacheKey];
    if (cached && Date.now() - cached.time < 60000) {
      return res.json(cached.data);
    }

    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, generic_name, company, category_name_fallback, category_id, strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)",
        { count: "exact" }
      )
      .range(from, to);

    if (searchQuery) {
      const formattedSearch = searchQuery
        .trim()
        .split(/\s+/)
        .map(w => `'${w}':*`)
        .join(" & ");
      query = query.textSearch("search_vector", formattedSearch);
    }

    if (category && category !== "All") {
      query = query.eq("category_name_fallback", category);
    }

    if (filter === "deals") {
      query = query.order("discount_percentage", { ascending: false });
    } else if (filter === "low_stock") {
      query = query.lte("stock_quantity", 150);
    }

    const { data: rawProducts, count, error } = await query;

    if (error) {
      console.error("Supabase products pagination query failed:", error);
      throw error;
    }

    const mappedProducts = (rawProducts || []).map((p: any) => {
      const inv = p.inventory && Array.isArray(p.inventory) ? p.inventory[0] : p.inventory || null;
      const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
      let sellingVal = 0;
      if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
        sellingVal = parseFloat(p.selling_price);
      } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
        sellingVal = parseFloat(p.sellingPrice);
      } else {
        sellingVal = mrpVal;
      }
      const stockVal =
        p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
          ? parseInt(p.stock_quantity, 10)
          : inv
          ? inv.available_stock ?? 0
          : p.availableStock ?? 0;

      return {
        id: String(p.id || "").trim(),
        name: p.name || "Pharmaceutical Item",
        genericName: p.generic_name || p.genericName || "Generic Medicine",
        company: p.company || "MediChain Partner",
        category: p.category_name_fallback || p.category_id || p.category || "Tablet",
        strength: p.strength || "N/A",
        packSize: p.pack_size || p.packSize || "10x10 Box",
        mrp: mrpVal,
        sellingPrice: sellingVal,
        discountPercentage: p.discount_percentage
          ? parseFloat(p.discount_percentage)
          : mrpVal > 0
          ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100)
          : 0,
        availableStock: stockVal,
        reservedStock: inv ? inv.reserved_stock ?? 0 : 0,
        soldStock: inv ? inv.sold_stock ?? 0 : 0,
        batchNumber: p.batch_number || (inv ? inv.batch_number || "" : "") || "B-MCH2026",
        expiryDate: p.expiry_date || (inv ? inv.expiry_date || "" : "") || "2027-12-31",
        imageUrl: p.image_url || p.imageUrl || undefined,
        image_url: p.image_url || p.imageUrl || undefined
      };
    });

    if (filter === "frequent") {
      mappedProducts.sort((a, b) => b.soldStock - a.soldStock);
    }

    let responseData: any;
    if (paginate === "true" || page || limit) {
      const total = count || 0;
      const pages = Math.ceil(total / limitNum);
      responseData = {
        products: mappedProducts,
        total,
        page: pageNum,
        pageSize: limitNum,
        pages,
        suggestions: [],
        originalQuery: searchQuery,
        correctedQuery: undefined
      };
    } else {
      responseData = mappedProducts;
    }

    productCache[cacheKey] = { data: responseData, time: Date.now() };
    return res.json(responseData);
  } catch (err: any) {
    console.error("Products Fetch Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const { default: dbService } = await import("../../src/lib/dbService.js");
    const product = await dbService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/prescription/scan", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "No image data provided for scanning." });
  }

  res.json({ success: true, status: "processing", message: "Prescription is being processed in the background", items: [] });

  (async () => {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const mimeType = imageBase64.startsWith("data:image/jpeg")
        ? "image/jpeg"
        : imageBase64.startsWith("data:image/webp")
        ? "image/webp"
        : "image/png";
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await runWithRetry(() =>
        ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: {
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              {
                text: `Analyze this medical prescription. Extract the list of medicines. 
             Return ONLY a raw, minified JSON array of objects without markdown formatting.
             Format: [{"name": "string", "strength": "string or null", "quantity": number}]`
              }
            ]
          }
        })
      );

      const aiText = response.text || "[]";
      let parsedItems = [];
      try {
        const cleanJson = aiText
          .replace(/\x60\x60\x60json/g, "")
          .replace(/\x60\x60\x60/g, "")
          .trim();
        parsedItems = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("Failed to parse Gemini output as JSON:", aiText);
        return;
      }

      const { data: dbProducts } = await supabaseAdmin
        .from("products")
        .select("id, name, generic_name, manufacturer, strength, form, pack_size, mrp, selling_price, stock_quantity, image_url");

      const matchedProducts = [];
      for (const item of parsedItems) {
        if (!item.name) continue;
        const results = performSearch(dbProducts || [], item.name, { pageSize: 1 });
        if (results.products && results.products.length > 0) {
          matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: results.products[0]
          });
        } else {
          matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: null
          });
        }
      }

      console.log("Background prescription processing completed.", matchedProducts.length, "items found.");
    } catch (err) {
      console.error("Prescription Scan Background Error:", err);
    }
  })();
});

export default router;
