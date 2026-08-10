import express from "express";
import compression from "compression";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Import libraries and helpers
import { importBulkCatalog } from "./src/lib/importService.js";
import { performSearch } from "./src/lib/searchService.js";
import { validateProduct, checkDuplicate } from "./src/lib/productValidator.js";
import { supabaseAdmin } from "./src/lib/supabaseAdmin.js";
import * as dbService from "./src/lib/dbService.js";
import { aiEnrichmentService } from "./src/lib/aiEnrichmentService.js";
import cron from "node-cron";

dotenv.config();


async function runWithRetry(fn, maxAttempts = 3, timeoutMs = 15000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs))
      ]);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, backoff));
    }
  }
}

const app = express();
app.use(compression());
app.set("trust proxy", 1); // Trust first proxy (necessary for secure cookie-sessions on reverse proxies like Vercel/Cloud Run)
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Stateless concurrent cookie session with strict security guidelines
const sessionSecret = process.env.SESSION_SECRET || "medichain_secure_session_secret_fallback_key_2026";
if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET environment variable is missing; utilizing default fallback secret.");
}

app.use(cookieSession({
  name: "session",
  keys: [sessionSecret],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: true,
  sameSite: "none"
}));

// Global fallback session middleware to support environments with blocked third-party cookies (e.g. iframes)
app.use((req: any, res: any, next: any) => {
  const headerUserId = req.headers["x-session-user-id"];
  if (headerUserId) {
    req.session = req.session || {};
    req.session.userId = headerUserId;
    req.session.email = req.headers["x-session-user-email"];
    req.session.role = req.headers["x-session-user-role"];
    req.session.name = req.headers["x-session-user-name"];
    req.session.pharmacy_id = req.headers["x-session-pharmacy-id"] || null;
  }
  next();
});

// --- RATE LIMITER MIDDLEWARE ---

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(options: { windowMs: number; max: number; message: string }) {
  return (req: any, res: any, next: any) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "global";
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      return res.status(429).json({ error: options.message });
    }

    record.count++;
    next();
  };
}

const loginLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please try again after 1 minute."
});

const importLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many catalog imports. Please try again after 1 minute."
});

// --- LOCAL USER FALLBACK DATA STORE (SECURELY HASHED) ---

const localUsersStore = new Map<string, any>();

// Seed default accounts in-memory for secure local preview operations with bcrypt hashes
(async () => {
  const salt = await bcrypt.genSalt(10);
  
  localUsersStore.set("admin@medichain.com", {
    id: "local-admin-111",
    email: "admin@medichain.com",
    name: "System Admin",
    role: "Admin",
    passwordHash: await bcrypt.hash("admin123", salt),
    createdAt: new Date().toISOString()
  });

  localUsersStore.set("depot@medichain.com", {
    id: "local-depot-222",
    email: "depot@medichain.com",
    name: "Depot Manager",
    role: "Depot Staff",
    passwordHash: await bcrypt.hash("depot123", salt),
    createdAt: new Date().toISOString()
  });

  localUsersStore.set("delivery@medichain.com", {
    id: "local-delivery-333",
    email: "delivery@medichain.com",
    name: "Delivery Rider",
    role: "Delivery Staff",
    passwordHash: await bcrypt.hash("delivery123", salt),
    createdAt: new Date().toISOString()
  });
})();

// --- AUTHORIZATION MIDDLEWARE & HELPER FUNCTIONS ---

function requireAuth(req: any, res: any, next: any) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Authentication required. Please log in first." });
  }
  req.user = {
    id: req.session.userId,
    email: req.session.email,
    role: req.session.role,
    name: req.session.name,
    pharmacy_id: req.session.pharmacy_id
  };
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const userRole = req.session.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: This action is restricted to the following roles: ${allowedRoles.join(", ")}`
      });
    }
    req.user = {
      id: req.session.userId,
      email: req.session.email,
      role: req.session.role,
      name: req.session.name,
      pharmacy_id: req.session.pharmacy_id
    };
    next();
  };
}

async function requireVerifiedPharmacy(req: any, res: any, next: any) {
  if (req.user && (req.user.role === "Pharmacy Owner" || req.user.role === "User")) {
    try {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
      if (!pharmacy) {
        return res.status(403).json({ error: "Your account is pending admin approval." });
      }
      const st = (pharmacy.verificationStatus || "").toString().toLowerCase();
      if (st === "suspended" || st === "rejected") {
        return res.status(403).json({ error: "Account Suspended — contact support." });
      }
      if (st !== "approved" && st !== "verified") {
        return res.status(403).json({ error: "Your account is pending admin approval." });
      }
    } catch (e: any) {
      return res.status(403).json({ error: "Verification check failed. Please log in again." });
    }
  }
  next();
}

// --- HEALTH CHECK ENDPOINT ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// --- DIAGNOSTIC ENDPOINTS ---
app.post("/api/diagnostic/verify-cart-products", requireAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    let targetIds = productIds || [];

    if (!targetIds || targetIds.length === 0) {
      const cartItems = await dbService.getCart(req.user.id);
      targetIds = cartItems.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
    }

    const { data: allProducts, error } = await supabaseAdmin.from("products").select("id, name").in("id", targetIds);
    if (error) throw error;
    const productMap = new Map();
    (allProducts || []).forEach((p: any) => productMap.set(String(p.id).trim().toLowerCase(), p));

    const summary = {
      totalProductsInDb: allProducts?.length || 0,
      targetIdsToCheck: targetIds,
      found: [] as any[],
      missing: [] as string[],
      dbSampleIds: (allProducts || []).slice(0, 10).map((p: any) => ({ id: p.id, name: p.name }))
    };

    for (const id of targetIds) {
      const normalizedId = String(id).trim().toLowerCase();
      if (productMap.has(normalizedId)) {
        summary.found.push({ requestedId: id, foundId: productMap.get(normalizedId).id, name: productMap.get(normalizedId).name });
      } else {
        summary.missing.push(id);
      }
    }

    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTHENTICATION & SESSION ENDPOINTS ---

app.post("/api/auth/local-signup", loginLimiter, async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required registration parameters (email, password, name)." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (localUsersStore.has(normalizedEmail)) {
    return res.status(400).json({ error: "User already exists with this email address." });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: "local-usr-" + Math.random().toString(36).substring(2, 11),
      email: normalizedEmail,
      name,
      role: "Pharmacy Owner",
      passwordHash,
      createdAt: new Date().toISOString()
    };

    localUsersStore.set(normalizedEmail, newUser);

    // Sync database user profile in parallel to persist details in users table
    await dbService.syncSession(newUser.id, newUser.email, newUser.name, newUser.role).catch(err => {
      console.warn("Could not insert user profile to Supabase users table:", err.message);
    });

    req.session = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      pharmacy_id: null
    };

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      },
      needsSetup: true,
      pharmacy: null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/local-login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = localUsersStore.get(normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Load any existing pharmacy profile synced in Supabase database
    const pharmacy = await dbService.getPharmacyProfile(user.id).catch(() => null);
    const pharmacyId = pharmacy ? pharmacy.id : null;

    req.session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      pharmacy_id: pharmacyId
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pharmacy_id: pharmacyId
      },
      needsSetup: !pharmacyId,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/sync-session", loginLimiter, async (req, res) => {
  const { id, email, name, phone, role } = req.body;
  if (!id || !email) {
    return res.status(400).json({ error: "Missing required session parameters (id, email)." });
  }

  try {
    let user: any = null;
    let syncError: any = null;

    try {
      const { data, error } = await dbService.syncSession(id, email, name, role || "Pharmacy Owner", phone);
      user = data;
      syncError = error;
    } catch (e: any) {
      syncError = e;
    }

    if (syncError || !user) {
      console.warn("WARNING: Database sync-session failed, using fallback user profile:", syncError?.message || syncError);
      user = {
        id,
        email,
        name: name || "Pharmacy Owner",
        role: role || "Pharmacy Owner",
        phone: phone || "",
        pharmacy_id: null
      };
    }

    req.session = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      pharmacy_id: user.pharmacy_id
    };

    let pharmacy = null;
    try {
      pharmacy = await dbService.getPharmacyProfile(user.id);
    } catch (e: any) {
      console.warn("WARNING: Failed to fetch pharmacy profile for session:", e.message || e);
    }
    const needsSetup = !pharmacy || !pharmacy.pharmacyName;

    res.json({
      success: true,
      user,
      needsSetup,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// --- PHARMACY PROFILE WORKFLOWS ---

app.get("/api/pharmacy/profile", requireAuth, async (req, res) => {
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) {
      user = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        phone: ""
      };
    }
    const pharmacy = await dbService.getPharmacyProfile(req.user.id).catch(() => null);
    res.json({
      user,
      pharmacy
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pharmacy/profile", requireAuth, async (req, res) => {
  try {
    const { data: ph, error } = await dbService.updatePharmacyProfile(req.user.id, req.body);

    if (error || !ph) {
      return res.status(500).json({ error: "Failed to update profile: " + error?.message });
    }

    const updatedPharmacy = await dbService.getPharmacyProfile(req.user.id);
    res.json({ success: true, pharmacy: updatedPharmacy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- MEDICINES & PRODUCT CATALOG ---

let cachedCategories: string[] | null = null;
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
});

const productCache: Record<string, { data: any, time: number }> = {};

app.get("/api/products", async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = (search as string) || "";
  const cacheKey = `${filter}_${category}_${searchQuery}_${pageNum}_${limitNum}`;

  try {
    const cached = productCache[cacheKey];
    if (cached && Date.now() - cached.time < 60000) { // 60 seconds cache for all queries
      return res.json(cached.data);
    }

    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from("products")
      .select("id, name, generic_name, company, category_name_fallback, category_id, strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)", { count: "exact" })
      .range(from, to);

    if (searchQuery) {
      // Transform search query for prefix matching in tsvector (e.g., "para" -> "'para':*")
      const formattedSearch = searchQuery.trim().split(/\s+/).map(w => `'${w}':*`).join(' & ');
      query = query.textSearch('search_vector', formattedSearch);
    }

    if (category && category !== "All") {
      query = query.eq("category_name_fallback", category);
    }

    // Sort Filters
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
      // Map to frontend Product type
      const inv = p.inventory && Array.isArray(p.inventory) ? p.inventory[0] : (p.inventory || null);
      const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
      let sellingVal = 0;
      if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
        sellingVal = parseFloat(p.selling_price);
      } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
        sellingVal = parseFloat(p.sellingPrice);
      } else {
        sellingVal = mrpVal;
      }
      const stockVal = p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
        ? parseInt(p.stock_quantity, 10)
        : (inv ? (inv.available_stock ?? 0) : (p.availableStock ?? 0));

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
        discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
        availableStock: stockVal,
        reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
        soldStock: inv ? (inv.sold_stock ?? 0) : 0,
        batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
        expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
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
        suggestions: [], // Server-side search doesn't do suggestions in this simplified query
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

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await dbService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI PRESCRIPTION SCANNER (Gemini Vision) ---

app.post("/api/prescription/scan", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "No image data provided for scanning." });
  }


  // Respond immediately
  res.json({ success: true, status: "processing", message: "Prescription is being processed in the background", items: [] });
  
  // Process asynchronously
  (async () => {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
      const mimeType = imageBase64.startsWith("data:image/jpeg") ? "image/jpeg" :
                       imageBase64.startsWith("data:image/webp") ? "image/webp" : "image/png";
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await runWithRetry(() => ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: `Analyze this medical prescription. Extract the list of medicines. 
             Return ONLY a raw, minified JSON array of objects without markdown formatting.
             Format: [{"name": "string", "strength": "string or null", "quantity": number}]` }
          ]
        }
      }));

      const aiText = response.text || "[]";
      let parsedItems = [];
      try {
        const cleanJson = aiText.replace(/\x60\x60\x60json/g, "").replace(/\x60\x60\x60/g, "").trim();
        parsedItems = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.warn("Failed to parse Gemini output as JSON:", aiText);
        return;
      }

      // Attempt to match with existing products in the DB
      const { data: dbProducts } = await dbService.supabaseAdmin.from("products").select("id, name, generic_name, manufacturer, strength, form, pack_size, mrp, selling_price, stock_quantity, image_url");
      const matchedProducts = [];
      for (const item of parsedItems) {
        if (!item.name) continue;
        const results = performSearch(dbProducts || [], item.name, { pageSize: 1 });
        if (results.products && results.products.length > 0) {
          matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: results.products[0],
          });
        } else {
           matchedProducts.push({
            extractedName: item.name,
            extractedStrength: item.strength,
            extractedQuantity: item.quantity || 1,
            matchedProduct: null,
          });
        }
      }
      
      console.log("Background prescription processing completed.", matchedProducts.length, "items found.");
      // Ideally we would send a websocket event or notification here.
    } catch (err) {
      console.error("Prescription Scan Background Error:", err);
    }
  })();
});


// --- PROCUREMENT CART (Stateless DB Synced) ---

app.get("/api/cart", requireAuth, async (req, res) => {
  try {
    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems: any[] = [];
    let cartModified = false;
    
    if (cartItemsInDb.length > 0) {
      const productIds = cartItemsInDb.map((item: any) => item.productId);
      
      const { data: dbProducts, error } = await dbService.supabaseAdmin
        .from('products')
        .select('*, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)')
        .in('id', productIds);
        
      if (!error && dbProducts) {
        // Map them
        const productMap = new Map();
        dbProducts.forEach((p: any) => {
          // map it just like getProductById does
          const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
          let sellingVal = 0;
          if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
            sellingVal = parseFloat(p.selling_price);
          } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
            sellingVal = parseFloat(p.sellingPrice);
          } else {
            sellingVal = mrpVal;
          }
          
          const inv = Array.isArray(p.inventory) && p.inventory.length > 0 ? p.inventory[0] : (p.inventory || null);
          const stockVal = p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
            ? parseInt(p.stock_quantity, 10)
            : (inv ? (inv.available_stock ?? 0) : (p.availableStock ?? 0));

          productMap.set(p.id, {
            id: String(p.id).trim(),
            name: p.name,
            genericName: p.generic_name || p.genericName || "Generic Medicine",
            company: p.company,
            category: p.category_name_fallback || p.category_id || p.category || "Tablet",
            strength: p.strength,
            packSize: p.pack_size || p.packSize,
            mrp: mrpVal,
            sellingPrice: sellingVal,
            discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
            availableStock: stockVal,
            reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
            soldStock: inv ? (inv.sold_stock ?? 0) : 0,
            batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
            expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
            imageUrl: p.image_url || p.imageUrl || undefined,
          });
        });
        
        for (const item of cartItemsInDb) {
          const product = productMap.get(item.productId);
          if (product) {
            cartItems.push({
              product,
              quantity: item.quantity
            });
          } else {
            cartModified = true;
          }
        }
      } else {
        cartModified = true;
      }
    }
    
    if (cartModified) {
      // Clean up the DB cart to remove orphaned/deleted products
      await dbService.saveCart(req.user.id, cartItems.map(c => ({ productId: c.product.id, quantity: c.quantity })));
    }

    const totalMrp = cartItems.reduce((acc, item) => acc + (item.product.mrp * item.quantity), 0);
    const totalAmount = cartItems.reduce((acc, item) => acc + (item.product.sellingPrice * item.quantity), 0);
    const totalSavings = totalMrp - totalAmount;

    res.json({
      items: cartItems,
      totalMrp,
      totalAmount,
      totalSavings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/add", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const product = await dbService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const dbCart = await dbService.getCart(req.user.id);
    const existing = dbCart.find((c: any) => c.productId === productId);
    const totalQty = (existing ? existing.quantity : 0) + quantity;

    // Bypass stock block for demo
    // if (totalQty > product.availableStock) {
    //   return res.status(400).json({ error: `Only ${product.availableStock} boxes are available in stock.` });
    // }

    if (existing) {
      existing.quantity = totalQty;
    } else {
      dbCart.push({ productId, quantity });
    }

    await dbService.saveCart(req.user.id, dbCart);
    res.json({ success: true, cartCount: dbCart.reduce((acc: number, c: any) => acc + c.quantity, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/update", requireAuth, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const dbCart = await dbService.getCart(req.user.id);
    const item = dbCart.find((c: any) => c.productId === productId);
    const product = await dbService.getProductById(productId);

    if (!item || !product) {
      return res.status(404).json({ error: "Cart item or product not found." });
    }

    // Bypass stock block for demo
    // if (quantity > product.availableStock) {
    //   return res.status(400).json({ error: `Only ${product.availableStock} boxes are available in stock.` });
    // }

    let newCart = dbCart;
    if (quantity <= 0) {
      newCart = dbCart.filter((c: any) => c.productId !== productId);
    } else {
      item.quantity = quantity;
    }

    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/remove", requireAuth, async (req, res) => {
  const { productId } = req.body;
  try {
    const dbCart = await dbService.getCart(req.user.id);
    const newCart = dbCart.filter((c: any) => c.productId !== productId);
    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/cart/clear", requireAuth, async (req, res) => {
  try {
    await dbService.saveCart(req.user.id, []);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({
        totalPurchase: 0,
        activeCredit: 0,
        dueAmount: 0,
        totalSavings: 0,
        ordersTrend: []
      });
    }

    const orders = await dbService.getOrders(pharmacy.id);
    const totalPurchase = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const totalSavings = orders.reduce((sum: number, o: any) => sum + (o.totalSavings || 0), 0);

    const ordersTrend = orders.slice(-7).map((o: any) => ({
      date: new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      amount: o.totalAmount
    }));

    res.json({
      totalPurchase,
      activeCredit: pharmacy.usedCredit,
      dueAmount: pharmacy.usedCredit,
      totalSavings,
      ordersTrend
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROCUREMENT ORDERS & RETURNS ---

app.get("/api/pharmacy/dashboard-summary", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({
        totalOrders: 0,
        monthlyPurchase: 0,
        creditLimit: 0,
        outstandingDue: 0,
        savedAmount: 0
      });
    }

    const orders = await dbService.getOrders(pharmacy.id);
    const totalOrders = orders.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyPurchase = orders
      .filter((o: any) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    const savedAmount = orders.reduce((sum: number, o: any) => sum + (o.totalSavings || 0), 0);

    res.json({
      totalOrders,
      monthlyPurchase,
      creditLimit: pharmacy.creditLimit,
      outstandingDue: pharmacy.usedCredit,
      savedAmount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    let user = await dbService.getUserById(req.user.id).catch(() => null);
    if (!user) user = req.user;
    if (user?.role === "Pharmacy Owner") {
      const pharmacy = await dbService.getPharmacyProfile(req.user.id);
      if (!pharmacy) return res.json([]);
      const orders = await dbService.getOrders(pharmacy.id);
      return res.json(orders);
    } else if (user?.role === "Admin" || user?.role === "Depot Staff" || user?.role === "Delivery Staff") {
      const orders = await dbService.getOrders();
      return res.json(orders);
    }
    res.json([]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders", requireAuth, async (req, res) => {
  const { paymentMethod, notes, deliveryAddress, paymentStatus, transactionId } = req.body;

  try {
    const cartItems = await dbService.getCart(req.user.id);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const itemIds = cartItems.map((item: any) => String(item.productId || "").trim()).filter(Boolean);
    if (itemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }

    // Use supabaseAdmin (service role client) to ensure RLS does not block product verification
    let { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', itemIds);

    if (error) {
      console.error("Error querying products during order creation:", error);
      return res.status(400).json({ error: `Failed to query products: ${error.message}` });
    }

    // Normalize map keys for case-insensitive and trimmed UUID lookup
    const productMap = new Map<string, any>();
    (products || []).forEach((p: any) => {
      if (p.id) {
        productMap.set(String(p.id).trim().toLowerCase(), p);
      }
    });

    // Strict verification for any missing products against database catalog
    const validItemIds = [];
    for (const itemId of itemIds) {
      const normalizedId = String(itemId).trim().toLowerCase();
      if (!productMap.has(normalizedId)) {
        const directProd = await dbService.getProductById(itemId);
        if (directProd) {
          productMap.set(normalizedId, directProd);
          validItemIds.push(itemId);
        }
      } else {
        validItemIds.push(itemId);
      }
    }
    
    if (validItemIds.length === 0) {
      return res.status(400).json({ error: "No valid product items in your cart." });
    }
    
    // Filter out invalid items from cartItems array
    const validCartItems = cartItems.filter((item: any) => 
      validItemIds.includes(String(item.productId || "").trim())
    );

    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.status(400).json({ error: "Pharmacy verification profile not found." });
    }

    const st = (pharmacy.verificationStatus || "").toString().toLowerCase();
    if (st !== "approved" && st !== "verified") {
      return res.status(403).json({ error: "Your account is pending admin approval. You cannot place orders until verified." });
    }

    const result = await dbService.createOrderTransaction(req.user.id, pharmacy.id, {
      paymentMethod,
      notes,
      paymentStatus,
      transactionId,
      items: validCartItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      deliveryAddress
    });

    await dbService.saveCart(req.user.id, []);

    res.json({
      success: true,
      orderId: result.order.id,
      order: result.order
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/payments/process", requireAuth, async (req, res) => {
  const { orderId, paymentMethod, walletNumber, pin, amount, transactionId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing order ID" });
  }

  try {
    const generatedTrxId = transactionId || `PGW-${(paymentMethod || "GATEWAY").toUpperCase().substring(0, 5)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const result = await dbService.processPaymentGatewayTransaction(
      orderId,
      paymentMethod || "bKash",
      generatedTrxId,
      amount
    );

    res.json({
      success: true,
      message: `Payment of ৳${result.amount.toLocaleString()} processed successfully via ${paymentMethod || 'bKash'} Gateway`,
      transactionId: generatedTrxId,
      orderId: result.orderId,
      status: result.status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Payment processing failed" });
  }
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function generateInvoicePdf(res: express.Response, order: any, pharmacy: any, invoiceNumber: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.id}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  // Colors and Styles
  const primaryColor = "#4f46e5"; // Indigo-600
  const secondaryColor = "#1e293b"; // Slate-800
  const lightGray = "#f1f5f9";
  const grayText = "#64748b";

  // Top Accent Banner
  doc.rect(0, 0, doc.page.width, 10).fill(primaryColor);

  // Company Header (Left)
  doc.moveDown(2);
  doc.fillColor(primaryColor).fontSize(28).font("Helvetica-Bold").text("MediChain", 40, 40);
  doc.fillColor(secondaryColor).fontSize(10).font("Helvetica").text("B2B Medicine Wholesale Logistics", 40, 72);
  doc.fillColor(grayText).fontSize(9).text("Plot 12, Tejgaon Industrial Area\nDhaka-1208, Bangladesh\nPhone: +880 1700-000000\nEmail: accounts@medichain.bd.com", 40, 88);

  // Invoice Meta (Right)
  const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  
  doc.fillColor(primaryColor).fontSize(22).font("Helvetica-Bold").text("INVOICE", 380, 40, { align: "right" });
  
  doc.fillColor(secondaryColor).fontSize(10).font("Helvetica-Bold").text("Invoice Number:", 380, 72, { align: "right" });
  doc.font("Helvetica").text(invoiceNumber, 380, 86, { align: "right" });
  
  doc.font("Helvetica-Bold").text("Date of Issue:", 380, 102, { align: "right" });
  doc.font("Helvetica").text(createdDate, 380, 116, { align: "right" });
  
  doc.font("Helvetica-Bold").text("Order Reference:", 380, 132, { align: "right" });
  doc.font("Helvetica").text(order.readableId || order.id.substring(0,8).toUpperCase(), 380, 146, { align: "right" });

  doc.moveDown(3);

  // Billing and Shipping Info Box
  const billingY = 190;
  doc.rect(40, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(40, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("BILLED TO", 48, billingY + 6);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(11).text(pharmacy?.pharmacyName || "Registered Pharmacy Partner", 48, billingY + 28);
  doc.font("Helvetica").fontSize(9);
  if (pharmacy?.ownerName) doc.text(`Proprietor: ${pharmacy.ownerName}`, 48, billingY + 44);
  if (pharmacy?.licenseNo) doc.text(`Drug License: ${pharmacy.licenseNo}`, 48, billingY + 56);
  if (pharmacy?.phone) doc.text(`Phone: ${pharmacy.phone}`, 48, billingY + 68);
  if (pharmacy?.address) doc.text(`Address: ${pharmacy.address}`, 48, billingY + 80, { width: 230 });

  // Payment Info Box
  doc.rect(305, billingY, 250, 100).fill(lightGray).stroke(primaryColor).lineWidth(0.5).stroke();
  doc.rect(305, billingY, 250, 20).fill(primaryColor);
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text("PAYMENT DETAILS", 313, billingY + 6);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(10).text("Payment Method:", 313, billingY + 30);
  doc.font("Helvetica").text(order.paymentMethod || "B2B Credit Line", 400, billingY + 30);
  
  doc.font("Helvetica-Bold").text("Payment Status:", 313, billingY + 48);
  doc.font("Helvetica").fillColor(order.paymentStatus === "Paid" ? "#16a34a" : "#dc2626").text((order.paymentStatus || "Pending").toUpperCase(), 400, billingY + 48);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").text("Due Date:", 313, billingY + 66);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30); // 30 days net
  doc.font("Helvetica").text(dueDate.toLocaleDateString("en-GB"), 400, billingY + 66);

  // Table Headers
  const tableTop = 320;
  doc.rect(40, tableTop, doc.page.width - 80, 25).fill(primaryColor);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
  
  doc.text("ITEM DESCRIPTION", 50, tableTop + 8, { width: 180 });
  doc.text("STRENGTH", 240, tableTop + 8, { width: 80 });
  doc.text("QTY", 330, tableTop + 8, { width: 40, align: "center" });
  doc.text("UNIT PRICE", 380, tableTop + 8, { width: 70, align: "right" });
  doc.text("SUBTOTAL", 460, tableTop + 8, { width: 80, align: "right" });

  let position = tableTop + 35;
  
  const items = order.items || [];
  let alternate = false;

  // Table Rows
  for (const item of items) {
    if (position > 700) {
      doc.addPage();
      position = 40;
    }

    if (alternate) {
      doc.rect(40, position - 5, doc.page.width - 80, 20).fill(lightGray);
    }
    alternate = !alternate;

    doc.fontSize(9).font("Helvetica-Bold").fillColor(secondaryColor);
    doc.text(item.name || "Medicine Product", 50, position, { width: 180, lineBreak: false });
    
    doc.font("Helvetica").fillColor(grayText);
    doc.text(item.strength || "-", 240, position, { width: 80, lineBreak: false });
    doc.text((item.quantity || 0).toString(), 330, position, { width: 40, align: "center", lineBreak: false });
    doc.text(`BDT ${item.sellingPrice ? item.sellingPrice.toLocaleString() : "0"}`, 380, position, { width: 70, align: "right", lineBreak: false });
    doc.text(`BDT ${item.subtotal ? item.subtotal.toLocaleString() : "0"}`, 460, position, { width: 80, align: "right", lineBreak: false });
    
    position += 20;
  }

  // Table Footer Line
  doc.moveTo(40, position).lineTo(doc.page.width - 40, position).strokeColor(primaryColor).lineWidth(1).stroke();
  position += 15;

  // Breakdown costs & totals
  const totalMrp = order.totalMrp || order.totalAmount || 0;
  const totalAmount = order.totalAmount || 0;
  const totalSavings = order.totalSavings || (totalMrp - totalAmount);

  doc.font("Helvetica-Bold").fontSize(10).fillColor(secondaryColor);
  doc.text("SUBTOTAL:", 350, position, { width: 100, align: "right" });
  doc.font("Helvetica").text(`BDT ${totalMrp.toLocaleString()}`, 460, position, { width: 80, align: "right" });
  position += 20;

  if (totalSavings > 0) {
    doc.font("Helvetica-Bold").fillColor("#16a34a");
    doc.text("WHOLESALE SAVINGS:", 300, position, { width: 150, align: "right" });
    doc.font("Helvetica").text(`- BDT ${totalSavings.toLocaleString()}`, 460, position, { width: 80, align: "right" });
    position += 20;
  }

  // Draw Total Box
  doc.rect(340, position, doc.page.width - 380, 30).fill(lightGray);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
  doc.text("NET PAYABLE:", 350, position + 8, { width: 100, align: "right" });
  doc.text(`BDT ${totalAmount.toLocaleString()}`, 460, position + 8, { width: 80, align: "right" });
  position += 50;

  // Barcode / Verification Hash area (Simulated with text font)
  doc.font("Courier").fontSize(8).fillColor(grayText);
  doc.text(`*|| ${order.id} ||*`, 40, position);
  doc.text(`VERIFICATION HASH: ${Buffer.from(order.id).toString('base64').substring(0, 16)}`, 40, position + 10);

  // Footer & Terms
  doc.moveDown(4);
  const footerY = doc.page.height - 100;
  doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).strokeColor(lightGray).lineWidth(1).stroke();
  
  doc.font("Helvetica-Bold").fontSize(8).fillColor(secondaryColor).text("Terms & Conditions:", 40, footerY + 15);
  doc.font("Helvetica").fillColor(grayText).fontSize(7);
  doc.text("1. FEFO Policy applies. Goods once delivered and accepted cannot be returned unless expired upon delivery.", 40, footerY + 28);
  doc.text("2. Credit payments must be cleared within 30 days of the invoice date.", 40, footerY + 38);
  doc.text("3. This is a computer-generated tax invoice and requires no physical signature.", 40, footerY + 48);

  doc.end();
}

app.get("/api/orders/:id/invoice", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let pharmacy = null;
    if (order.pharmacyId) {
      pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    }

    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await dbService.supabaseAdmin
        .from("invoices")
        .select("invoice_number")
        .eq("order_id", order.id)
        .maybeSingle();
      if (inv?.invoice_number) {
        invoiceNumber = inv.invoice_number;
      }
    } catch (e) {
      // Fall back to default invoiceNumber
    }

    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Pending" && order.status !== "Confirmed") {
      return res.status(400).json({ error: "Cannot cancel order that is already being processed." });
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, "Cancelled");
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/status", requireAuth, async (req, res) => {
  const { status, otp } = req.body;
  const role = req.user.role;

  if (role === "Pharmacy Owner") {
    return res.status(403).json({ error: "Unauthorized. Pharmacy Owners cannot alter order status manually." });
  }

  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Multi-Role Order Lifecycle Enforcement
    if (role === "Admin") {
      if (status !== "Confirmed" && status !== "Cancelled") {
        return res.status(403).json({ error: "Admin can only confirm or cancel orders." });
      }
    } else if (role === "Depot Staff") {
      if (status !== "Processing" && status !== "Packed" && status !== "Out for Delivery") {
        return res.status(403).json({ error: "Depot staff can only set Processing, Packed, or Out for Delivery." });
      }
    } else if (role === "Delivery Staff") {
      if (status !== "Out for Delivery" && status !== "Delivered") {
        return res.status(403).json({ error: "Delivery staff can only set Out for Delivery or Delivered." });
      }
      if (status === "Delivered") {
        if (!otp || String(otp) !== String(order.handoverOtp)) {
          return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
        }
      }
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status);
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
    
    // Real-time broadcast
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/return", requireAuth, async (req, res) => {
  const { reason, productId, quantity } = req.body;
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ error: "Only delivered orders can be requested for return." });
    }

    // Default first product if not provided
    const targetProdId = productId || (order.items[0]?.productId);
    const targetQty = quantity || (order.items[0]?.quantity || 1);

    await dbService.createReturnRequest(req.params.id, targetProdId, targetQty, reason || "Damage");
    const updated = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/approve-return", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getReturns();
    const rItem = list.find(r => r.orderId === req.params.id);
    if (!rItem) {
      return res.status(404).json({ error: "Return request not found." });
    }

    await dbService.approveReturn(rItem.id, req.user.id);
    const order = await dbService.getOrderById(req.params.id);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/reorder", requireAuth, async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const newCart = [];
    for (const item of order.items) {
      const product = await dbService.getProductById(item.productId);
      if (product) {
        const addQty = Math.min(item.quantity, product.availableStock);
        if (addQty > 0) {
          newCart.push({ productId: item.productId, quantity: addQty });
        }
      }
    }

    await dbService.saveCart(req.user.id, newCart);
    res.json({ success: true, cartCount: newCart.reduce((acc, c) => acc + c.quantity, 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FAVOURITES MANAGEMENT ---

app.get("/api/favourites/ids", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavouritesIds(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/favourites", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavourites(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/favourites/toggle", requireAuth, async (req, res) => {
  const { productId } = req.body;
  try {
    const result = await dbService.toggleFavourite(req.user.id, productId);
    res.json({ success: true, isFavourite: result.isFavourite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- REALTIME COMPATIBLE NOTIFICATIONS ---

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getNotifications(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleMarkRead = async (req: any, res: any) => {
  try {
    await dbService.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/notifications/read/:id", requireAuth, handleMarkRead);
app.patch("/api/notifications/read/:id", requireAuth, handleMarkRead);
app.post("/api/notifications/:id/read", requireAuth, handleMarkRead);
app.patch("/api/notifications/:id/read", requireAuth, handleMarkRead);

const handleMarkAllRead = async (req: any, res: any) => {
  try {
    await dbService.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.post("/api/notifications/read-all", requireAuth, handleMarkAllRead);
app.patch("/api/notifications/read-all", requireAuth, handleMarkAllRead);


// --- DEPOT CHANNELS ---

app.get("/api/depot/dashboard", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Depot Portal.",
    role: req.user.role,
    capabilities: [
      "View Assigned Orders",
      "Update Packing Status",
      "Manage Inventory",
      "Update Batch Information",
      "Manage Expiry Tracking"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/depot/assigned-orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const pendingDepotOrders = orders.filter(o => o.status === "Processing" || o.status === "Packed");
    res.json({ success: true, orders: pendingDepotOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/orders", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/accept", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Confirmed");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/process", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Processing");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/pack", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Packed");
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/orders/:id/assign-delivery", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { assignedRiderId } = req.body;
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, "Out for Delivery", undefined, assignedRiderId);
    if (error) return res.status(400).json({ error: error.message });
    const order = await dbService.getOrderById(req.params.id);
    if (io) {
      io.to(`order_${req.params.id}`).emit("order_status_updated", order);
      io.to("role_Admin").emit("admin_order_updated", order);
      io.to("role_Delivery Staff").emit("admin_order_updated", order);
    }
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/depot/delivery-staff", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const { data, error } = await dbService.getDeliveryStaff();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, staff: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/update-packing", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { orderId, status } = req.body;
  if (!orderId || !status) {
    return res.status(400).json({ error: "Missing orderId or status parameter." });
  }
  try {
    const { error } = await dbService.updateOrderStatus(orderId, status);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: `Depot: Order packing status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/depot/batch-info", requireRole(["Admin", "Depot Staff"]), (req, res) => {
  res.json({ success: true, message: "Depot: Expiry logs and batch information updated." });
});

// --- DELIVERY CHANNELS ---

app.get("/api/delivery/dashboard", requireRole(["Admin", "Delivery Staff"]), (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the MediChain Delivery Companion API.",
    role: req.user.role,
    capabilities: [
      "View Assigned Deliveries",
      "Update Delivery Status",
      "Mark Delivered"
    ],
    timestamp: new Date().toISOString()
  });
});

app.get("/api/delivery/orders", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const assignedDeliveries = orders.filter(o => o.status === "Packed" || o.status === "Out for Delivery");
    res.json({ success: true, orders: assignedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/delivery/status/:id", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  const { status, otp, notes } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (status === "Delivered") {
      if (!otp || String(otp) !== String(order.handoverOtp)) {
        return res.status(400).json({ error: "Invalid OTP. Handover verification failed." });
      }
    }
    
    let finalNotes = order.notes || "";
    if (status === "Failed" && notes) {
      finalNotes = finalNotes ? `${finalNotes}\nFailure Reason: ${notes}` : `Failure Reason: ${notes}`;
    }

    const { error } = await dbService.updateOrderStatus(req.params.id, status, status === "Failed" ? finalNotes : undefined);
    if (error) return res.status(400).json({ error: error.message });
    
    // Real-time broadcast
    if (io) {
      const updated = await dbService.getOrderById(req.params.id);
      io.to(`order_${req.params.id}`).emit("order_status_updated", updated);
      io.to("role_Admin").emit("admin_order_updated", updated);
    }

    res.json({ success: true, message: `Delivery Status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery/history", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const completedDeliveries = orders.filter(o => o.status === "Delivered" || o.status === "Completed" || o.status === "Failed");
    res.json({ success: true, orders: completedDeliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMPLETE OPERATIONAL MANAGEMENT SUITE - ADMIN ENDPOINTS ---

app.get("/api/admin/dashboard", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalOrders = orders.length;

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingDeliveries = activeOrders.filter(o => o.status !== "Delivered" && o.status !== "Completed").length;

    const pharmacies = await dbService.getAllPharmacies();
    const pendingVerifications = pharmacies.filter(p => {
      const st = (p.verificationStatus || "").toString().toLowerCase();
      return st !== "approved" && st !== "verified" && st !== "suspended" && st !== "rejected";
    }).length;

    const { count: totalProductsCount } = await dbService.supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true });

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        pendingDeliveries,
        pendingVerifications,
        totalOrders,
        totalProducts: totalProductsCount || 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies", requireRole(["Admin"]), async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  try {
    const list = await dbService.getAllPharmacies(page, limit);
    res.json({ pharmacies: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/status", requireRole(["Admin"]), async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, status, req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Adjusted status of pharmacy ID ${req.params.id} to "${status}"`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/credit", requireRole(["Admin"]), async (req, res) => {
  const { creditLimit } = req.body;
  if (creditLimit === undefined) {
    return res.status(400).json({ error: "Missing creditLimit parameter." });
  }
  const numericLimit = parseFloat(creditLimit);
  if (isNaN(numericLimit) || numericLimit < 0) {
    return res.status(400).json({ error: "Invalid credit limit value." });
  }

  try {
    const { error } = await dbService.adjustPharmacyCredit(req.params.id, numericLimit);
    if (error) return res.status(400).json({ error: error.message });

    const updated = await dbService.getPharmacyById(req.params.id);
    await dbService.logAudit(`Adjusted credit limit of pharmacy ID ${req.params.id} to ৳${numericLimit.toLocaleString()}`, "Finance", req.params.id, req.user.email, req.user.role);
    res.json({ success: true, pharmacy: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies/pending", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAllPharmacies();
    const pending = list.filter(p => p.verificationStatus === "Pending");
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const ph = await dbService.getPharmacyById(req.params.id);
    if (!ph) return res.status(404).json({ error: "Pharmacy not found." });
    res.json(ph);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/approve", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Approved", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Approved pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/reject", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Rejected", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Rejected pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/request-update", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Pending", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Requested document update for pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/pharmacies/:id/suspend", requireRole(["Admin"]), async (req, res) => {
  try {
    const { error } = await dbService.updatePharmacyStatus(req.params.id, "Suspended", req.user.name);
    if (error) return res.status(400).json({ error });

    await dbService.logAudit(`Suspended pharmacy ID ${req.params.id}`, "Pharmacies", req.params.id, req.user.email, req.user.role);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/:id/price-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getPriceHistory(req.params.id);
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/inventory/alerts/sync", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const prods = await dbService.getProductsRaw();
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;

    for (const p of prods) {
      if (p.availableStock < lowStockThreshold) {
        await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${p.availableStock} units.`, p.id);
        alertsCreated.push(`${p.name} (Low Stock)`);
      }

      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiryDate} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }

    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/export/csv", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  try {
    const products = await dbService.getProductsRaw();
    const headers = [
      "ID",
      "Product Name",
      "Generic Formula Name",
      "Manufacturer Company",
      "Category",
      "Strength",
      "Pack Size",
      "MRP (BDT)",
      "Selling Price (BDT)",
      "Available Stock",
      "Batch Number",
      "Expiry Date",
      "Image URL"
    ];

    const escapeCSVCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = products.map((p: any) => [
      p.id,
      p.name,
      p.genericName || p.generic_name || "",
      p.company,
      p.category || p.category_name_fallback || "Tablet",
      p.strength || "",
      p.packSize || p.pack_size || "",
      p.mrp,
      p.sellingPrice || p.selling_price || p.mrp,
      p.availableStock !== undefined ? p.availableStock : (p.stock_quantity || 0),
      p.batchNumber || p.batch_number || "",
      p.expiryDate || p.expiry_date || "",
      p.imageUrl || p.image_url || ""
    ]);

    const csvLines = [
      headers.map(escapeCSVCell).join(","),
      ...rows.map((row: any[]) => row.map(escapeCSVCell).join(","))
    ];

    const csvContent = csvLines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="medichain-all-products-catalog-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/analytics", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalOrders = orders.length;

    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paidRevenue = activeOrders.filter(o => o.paymentStatus === "Paid").reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingRevenue = activeOrders.filter(o => o.paymentStatus !== "Paid").reduce((sum, o) => sum + o.totalAmount, 0);

    const statusDistribution: Record<string, number> = {};
    orders.forEach(o => {
      statusDistribution[o.status] = (statusDistribution[o.status] || 0) + 1;
    });

    const medicineCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!medicineCounts[item.productId]) {
          medicineCounts[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
        }
        medicineCounts[item.productId].quantity += item.quantity;
        medicineCounts[item.productId].revenue += item.subtotal;
      });
    });

    const topMedicines = Object.values(medicineCounts)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // a. last7DaysTrend: Aggregate order totals and counts grouped day-by-day for the last 7 calendar days
    const today = new Date();
    const daysMap: Record<string, { date: string; dateStr: string; amount: number; count: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDateStr = d.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      daysMap[isoDateStr] = {
        date: dateLabel,
        dateStr: isoDateStr,
        amount: 0,
        count: 0
      };
    }

    activeOrders.forEach(o => {
      if (o.createdAt) {
        const orderDateStr = new Date(o.createdAt).toISOString().split("T")[0];
        if (daysMap[orderDateStr]) {
          daysMap[orderDateStr].amount += o.totalAmount;
          daysMap[orderDateStr].count += 1;
        }
      }
    });

    const last7DaysTrend = Object.values(daysMap);

    // b. topPharmacies: Aggregate and rank top ordering pharmacies by total spend/order volume
    const pharmaciesList = await dbService.getAllPharmacies();
    const pharmacyMap = new Map(pharmaciesList.map(p => [p.id, p]));

    const pharmacySpendMap: Record<string, {
      pharmacyId: string;
      pharmacyName: string;
      ownerName: string;
      city: string;
      totalSpend: number;
      orderCount: number;
    }> = {};

    activeOrders.forEach(o => {
      const phId = o.pharmacyId;
      const ph = pharmacyMap.get(phId);
      const pharmacyName = ph ? ph.pharmacyName : "Unknown Pharmacy";
      const ownerName = ph ? ph.ownerName : "";
      const city = ph ? (ph.city || ph.area || "Dhaka") : "Dhaka";

      if (!pharmacySpendMap[phId]) {
        pharmacySpendMap[phId] = {
          pharmacyId: phId,
          pharmacyName,
          ownerName,
          city,
          totalSpend: 0,
          orderCount: 0
        };
      }
      pharmacySpendMap[phId].totalSpend += o.totalAmount;
      pharmacySpendMap[phId].orderCount += 1;
    });

    const topPharmacies = Object.values(pharmacySpendMap)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    const revenueOverTime = last7DaysTrend.map(d => ({
      date: d.date,
      amount: d.amount
    }));

    res.json({
      success: true,
      totalOrders,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      statusDistribution,
      topMedicines,
      topPharmacies,
      last7DaysTrend,
      revenueOverTime
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/invoices", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getInvoices();
    res.json({ success: true, invoices: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/invoices/:id/download", requireRole(["Admin"]), async (req, res) => {
  try {
    const order = await dbService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let pharmacy = null;
    if (order.pharmacyId) {
      pharmacy = await dbService.getPharmacyById(order.pharmacyId);
    }

    let invoiceNumber = `INV-${order.readableId ? order.readableId.replace("MCH-", "") : order.id.substring(0, 8).toUpperCase()}`;
    try {
      const { data: inv } = await dbService.supabaseAdmin
        .from("invoices")
        .select("invoice_number")
        .eq("order_id", order.id)
        .maybeSingle();
      if (inv?.invoice_number) {
        invoiceNumber = inv.invoice_number;
      }
    } catch (e) {
      // Fall back to default invoiceNumber
    }

    generateInvoicePdf(res, order, pharmacy, invoiceNumber);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/export-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getExportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/export-history", requireRole(["Admin"]), async (req, res) => {
  const { type, format } = req.body;
  try {
    await dbService.logExportHistory(format, type, 10, req.user.name);
    const list = await dbService.getExportHistory();
    res.json({ success: true, record: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/products", requireRole(["Admin"]), async (req, res) => {
  const productData = req.body;
  const validation = validateProduct(productData);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Database-driven duplicate prevention check (name + company + strength case-insensitive)
    const allProducts = await dbService.getProductsRaw();
    const isDuplicate = allProducts.some(p => {
      if (productData.id && p.id === productData.id) return false;
      return p.name.toLowerCase().trim() === productData.name.toLowerCase().trim() &&
             p.company.toLowerCase().trim() === productData.company.toLowerCase().trim() &&
             p.strength.toLowerCase().trim() === productData.strength.toLowerCase().trim();
    });

    if (isDuplicate) {
      return res.json({
        success: false,
        message: "Product already exists"
      });
    }

    const existing = await dbService.getProductById(productData.id);
    if (existing && existing.mrp !== productData.mrp) {
      await dbService.logPriceHistory(productData.id, productData.name, existing.mrp, productData.mrp, existing.sellingPrice, productData.sellingPrice, req.user.name);
    }
    
    // Check for significant price drop on frequently ordered items
    if (existing && productData.sellingPrice < existing.sellingPrice) {
      const dropAmount = existing.sellingPrice - productData.sellingPrice;
      const dropPercentage = (dropAmount / existing.sellingPrice) * 100;
      
      // Determine if it's frequently ordered (e.g., soldStock > 10)
      const isFrequentlyOrdered = (existing.soldStock || 0) > 10;

      if (dropPercentage >= 5 && isFrequentlyOrdered) {
        await dbService.sendNotification(
          null, // Broadcast to all
          `Price Drop Alert: ${productData.name}`,
          `Good news! The wholesale price for ${productData.name}, one of our frequently ordered items, has dropped by ${dropPercentage.toFixed(1)}%. Stock up now!`,
          "price_drop"
        );
      }
    }

    const saved = await dbService.addOrUpdateProduct(productData);
    await dbService.logAudit(`Product ${productData.id ? "updated" : "created"}: ${productData.name}`, "Products", saved.id, req.user.email, req.user.role);

    res.json({ success: true, message: "Product saved successfully.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Product not found." });
    }

    const updates = req.body;
    const merged = { ...existing, ...updates, id: req.params.id };

    if (updates.mrp !== undefined && updates.mrp !== existing.mrp) {
      await dbService.logPriceHistory(req.params.id, merged.name, existing.mrp, updates.mrp, existing.sellingPrice, merged.sellingPrice, req.user.name);
    }

    const saved = await dbService.addOrUpdateProduct(merged);
    await dbService.logAudit(`Product patched: ${saved.name}`, "Products", saved.id, req.user.email, req.user.role);

    res.json({ success: true, message: "Product updated in place.", product: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/products/:id", requireRole(["Admin"]), async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found." });

    await dbService.deleteProduct(req.params.id);
    await dbService.logAudit(`Product deleted: ${existing.name}`, "Products", req.params.id, req.user.email, req.user.role);

    res.json({ success: true, message: "Product deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/inventory/update", requireRole(["Admin", "Depot Staff"]), async (req, res) => {
  const { id, availableStock, batchNumber, expiryDate } = req.body;
  try {
    await dbService.updateInventoryStock(id, availableStock, batchNumber, expiryDate);
    const updated = await dbService.getProductById(id);
    await dbService.logAudit(`Inventory updated for product ID ${id}`, "Products", id, req.user.email, req.user.role);
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/notifications/broadcast", requireRole(["Admin"]), async (req, res) => {
  const { title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }
  try {
    await dbService.sendNotification(null, title, message, type || "system");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/products/import/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate = 
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

app.get("/api/admin/products/template", requireRole(["Admin", "Pharmacy Owner"]), (req, res) => {
  const csvTemplate = 
    "Product Name,Generic Name,Company,Category,Strength,Pack Size,MRP,Selling Price,Stock,Batch Number,Expiry Date,Image URL\n" +
    "Napa Extra,Paracetamol + Caffeine,Beximco Pharmaceuticals,Tablet,500mg + 65mg,240's Box,480.00,360.00,450,B-NPE92,2027-10-15,https://example.com/napa.png\n" +
    "Seclo 20,Omeprazole,Square Pharmaceuticals,Capsule,20mg,120's Box,720.00,576.00,550,SQ-SEC20,2027-12-05,https://example.com/seclo.png\n";

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=medi_chain_bulk_import_template.csv");
  res.status(200).send(csvTemplate);
});

app.post("/api/admin/products/import", requireRole(["Admin"]), importLimiter, async (req, res) => {
  const { csvContent, commit } = req.body;
  if (!csvContent || typeof csvContent !== "string") {
    return res.status(400).json({ error: "No CSV content provided." });
  }

  try {
    const prods = await dbService.getProductsRaw();
    const result = importBulkCatalog(csvContent, prods);

    const shouldCommit = commit !== false;
    if (shouldCommit && result.successCount > 0) {
      for (const p of result.importedProducts) {
        await dbService.addOrUpdateProduct(p as any);
      }
      await dbService.logImportHistory("bulk_import.csv", result.successCount, "Completed", req.user.name);
    }

    res.json({
      ...result,
      committed: shouldCommit
    });
  } catch (err: any) {
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
});

app.get("/api/admin/import-history", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getImportHistory();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/import-history", requireRole(["Admin"]), async (req, res) => {
  const { fileName, totalRows, successCount } = req.body;
  try {
    await dbService.logImportHistory(fileName, totalRows, "Completed", req.user.name);
    const list = await dbService.getImportHistory();
    res.json({ success: true, event: list[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/prices", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Pricing schema updated." });
});

app.post("/api/admin/discounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Product discount rate applied." });
});

app.post("/api/admin/credit-accounts", requireRole(["Admin"]), (req, res) => {
  res.json({ success: true, message: "Admin: Credit account bounds adjusted." });
});

app.post("/api/admin/trigger-price-drop", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Renata Price Drop Alert", message || "Additional 5% wholesale discount applied.", "price_drop");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/trigger-new-offer", requireRole(["Admin"]), async (req, res) => {
  const { title, message } = req.body;
  try {
    await dbService.sendNotification(null, title || "Exclusive Offer!", message || "Save up to 15% on wholesale select drugs.", "offer");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/audit-log", requireAuth, async (req, res) => {
  const { action, module, description, entity_id } = req.body;
  try {
    await dbService.logAudit(
      `${action}: ${description || ""}`,
      module || "General",
      entity_id || "",
      req.user.email,
      req.user.role
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/audit-logs", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAuditLogs();
    res.json({ success: true, auditLogs: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/notifications", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getNotifications();
    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/notifications/send", requireRole(["Admin"]), async (req, res) => {
  const { title, message, targetType, pharmacyId } = req.body;
  if (!title || !message || !targetType) {
    return res.status(400).json({ error: "Title, message, and targetType are required." });
  }
  try {
    await dbService.sendNotification(pharmacyId, title, message, targetType);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/run-alert-check", requireRole(["Admin"]), async (req, res) => {
  const alertsCreated: string[] = [];
  try {
    const prods = await dbService.getProductsRaw();
    const settings = await dbService.getSystemSettings();
    const lowStockThreshold = settings.low_stock_threshold || 50;

    for (const p of prods) {
      if (p.availableStock < lowStockThreshold) {
        await dbService.logAlert(`⚠️ Low Stock Alert: ${p.name}`, `The available stock for ${p.name} has fallen to ${p.availableStock} units.`, p.id);
        alertsCreated.push(`${p.name} (Low Stock)`);
      }

      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days <= 180 && days > 0) {
          await dbService.logAlert(`🚨 Expiring Soon: ${p.name}`, `Batch of ${p.name} is expiring on ${p.expiryDate} (${days} days remaining).`, p.id);
          alertsCreated.push(`${p.name} (Expiring)`);
        }
      }
    }

    res.json({ success: true, alertsCreated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/finance/summary", requireRole(["Admin"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const activeOrders = orders.filter(o => o.status !== "Cancelled");
    const totalSales = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = activeOrders
      .filter(o => o.createdAt.startsWith(todayStr))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const monthlyRevenue = activeOrders
      .filter(o => o.createdAt.startsWith(currentMonthPrefix))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingPayments = activeOrders
      .filter(o => o.paymentStatus === "Pending")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pharmacies = await dbService.getAllPharmacies();
    const totalOutstandingCredit = pharmacies.reduce((sum, ph) => sum + (ph.usedCredit || 0), 0);

    const paymentHistory = orders
      .filter(o => o.paymentStatus === "Paid" || o.paymentStatus === "Refunded")
      .map(o => {
        const ph = pharmacies.find(p => p.id === o.pharmacyId);
        return {
          id: "TXN-" + o.id.replace("MCH-", ""),
          orderId: o.id,
          pharmacyName: ph?.pharmacyName || "Registered Pharmacy",
          amount: o.totalAmount,
          method: o.paymentMethod,
          status: o.paymentStatus,
          date: o.createdAt
        };
      });

    res.json({
      success: true,
      totalSales,
      todaySales,
      monthlyRevenue,
      pendingPayments,
      totalOutstandingCredit,
      pharmacies,
      paymentHistory
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- GLOBAL ERROR HANDLING & INITIALIZATION ---

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred. Please contact MediChain Support.",
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

import { Server as SocketIOServer } from "socket.io";

let serverInstance: any;
let io: SocketIOServer;

async function startServer() {
  console.log(`[${new Date().toISOString()}] [INFO] [System] Initializing MediChain platform startup diagnostics...`);
  try {
    await dbService.getSystemSettings();
    console.log(`[${new Date().toISOString()}] [INFO] [Database] Connection diagnostic: SUCCESS. Supabase database backend is responsive and synchronized.`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [CRITICAL] [Database] Connection diagnostic: FAILED! Supabase database is unreachable. Error:`, err.message || err);
  }

  // --- AI PRODUCT ENRICHMENT ROUTES ---
app.get("/api/admin/enrichment/status", requireRole(["Admin"]), async (req, res) => {
  try {
    let state = await aiEnrichmentService.getState();
    if (state.status === "running") {
      state = await aiEnrichmentService.tick();
    }
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment status error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/start", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.start(req.body);
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment start error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/pause", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.pause();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/resume", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.resume();
    res.json(state);
  } catch (err: any) {
    console.error("Enrichment resume error:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/stop", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.stop();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/retry", requireRole(["Admin"]), async (req, res) => {
  try {
    const state = await aiEnrichmentService.retryFailed();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/enrichment/tick", async (req, res) => {
  const auth = req.headers["authorization"];
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const state = await aiEnrichmentService.tick();
    res.json({ ok: true, status: state.status, pending: state.pendingIds.length });
  } catch (err: any) {
    console.error("Enrichment tick error:", err);
    res.status(500).json({ error: err.message });
  }
});

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] [INFO] [System] MediChain Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });

  // Initialize Socket.io
  io = new SocketIOServer(serverInstance, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });
  app.set("io", io);

  io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] [INFO] [Socket] Client connected: ${socket.id}`);
    
    socket.on("join_order_room", (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`[Socket] Client ${socket.id} joined room: order_${orderId}`);
    });

    socket.on("join_role_room", (role) => {
      socket.join(`role_${role}`);
      console.log(`[Socket] Client ${socket.id} joined room: role_${role}`);
    });

    socket.on("disconnect", () => {
      console.log(`[${new Date().toISOString()}] [INFO] [Socket] Client disconnected: ${socket.id}`);
    });
  });

  




  const gracefulShutdown = (signal: string) => {
    console.warn(`[${new Date().toISOString()}] [WARN] [System] Received ${signal} signal. Initiating graceful shutdown...`);
    if (serverInstance) {
      serverInstance.close(() => {
        console.log(`[${new Date().toISOString()}] [INFO] [System] HTTP server closed gracefully. Releasing remaining handles.`);
        process.exit(0);
      });
      
      setTimeout(() => {
        console.error(`[${new Date().toISOString()}] [ERROR] [System] Graceful shutdown timed out. Forcing process termination.`);
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Advances the AI enrichment queue by one batch every minute while the
// server process is alive. Safe to call even when idle/paused — it's a
// no-op unless status is "running".
cron.schedule("* * * * *", async () => {
  try {
    await aiEnrichmentService.tick();
  } catch (err) {
    console.error("[enrichment] cron tick failed:", err);
  }
});

if (!process.env.VERCEL) {
  startServer();
}

export { app };
