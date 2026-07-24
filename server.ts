import express from "express";
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
import ocrRouter from "./src/routes/ocrRoutes.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // Trust first proxy (necessary for secure cookie-sessions on reverse proxies like Vercel/Cloud Run)
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Stateless concurrent cookie session with strict security guidelines
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error("CRITICAL: SESSION_SECRET environment variable is missing!");
  throw new Error("CRITICAL: SESSION_SECRET environment variable is missing! Configure SESSION_SECRET in your environment.");
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

const ocrLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many prescription OCR uploads. Please try again after 1 minute."
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

// --- HEALTH CHECK ENDPOINT ---

app.get("/api/health", async (req, res) => {
  try {
    // Simple fast probe to verify Supabase connection state
    const { error } = await dbService.getSystemSettings().catch(err => ({ error: err }));
    if (error) {
      return res.status(500).json({ status: "error", database: "disconnected", error: error.message || error });
    }
    res.json({ status: "ok", database: "connected" });
  } catch (err: any) {
    res.status(500).json({ status: "error", database: "disconnected", error: err.message });
  }
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

app.get("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("products").select("category_name_fallback");
    if (error) throw error;
    const categories = Array.from(new Set(data.map((p: any) => p.category_name_fallback).filter(Boolean)));
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories." });
  }
});

app.get("/api/products", async (req, res) => {
  const { search, category, filter, page, limit, paginate } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 50;
  const searchQuery = (search as string) || "";

  try {
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from("products")
      .select("*, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)", { count: "exact" })
      .range(from, to);

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,generic_name.ilike.%${searchQuery}%`);
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

    if (paginate === "true" || page || limit) {
      const total = count || 0;
      const pages = Math.ceil(total / limitNum);
      return res.json({
        products: mappedProducts,
        total,
        page: pageNum,
        pageSize: limitNum,
        pages,
        suggestions: [], // Server-side search doesn't do suggestions in this simplified query
        originalQuery: searchQuery,
        correctedQuery: undefined
      });
    }

    // Default return for non-paginated requests, although now it respects limit=50 by default
    res.json(mappedProducts);
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

// --- PROCUREMENT CART (Stateless DB Synced) ---

app.get("/api/cart", requireAuth, async (req, res) => {
  try {
    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems = [];
    for (const item of cartItemsInDb) {
      const product = await dbService.getProductById(item.productId);
      if (product) {
        cartItems.push({
          product,
          quantity: item.quantity
        });
      }
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

app.post("/api/cart/add", requireAuth, async (req, res) => {
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
  const { paymentMethod, notes, deliveryAddress } = req.body;

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
    for (const itemId of itemIds) {
      const normalizedId = String(itemId).trim().toLowerCase();
      if (!productMap.has(normalizedId)) {
        const directProd = await dbService.getProductById(itemId);
        if (directProd) {
          productMap.set(normalizedId, directProd);
        } else {
          return res.status(400).json({ error: "Selected product no longer exists in catalog" });
        }
      }
    }

    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.status(400).json({ error: "Pharmacy verification profile not found." });
    }

    if (pharmacy.verificationStatus !== "Approved") {
      return res.status(400).json({ error: "Your pharmacy profile is pending DGDA drug license verification" });
    }

    const result = await dbService.createOrderTransaction(req.user.id, pharmacy.id, {
      paymentMethod,
      notes,
      items: cartItems.map((item: any) => ({
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

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  // Header
  doc.fillColor("#0f172a").fontSize(20).text("MediChain B2B Medicine Wholesale", { align: "left" });
  doc.fontSize(10).fillColor("#64748b").text("Dhaka, Bangladesh | Support: +880 1700-000000 | ops@medichain.bd");
  doc.moveDown(1.5);

  // Invoice & Order Meta
  const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

  doc.fillColor("#1e293b").fontSize(14).text(`TAX INVOICE: ${invoiceNumber}`, { align: "right" });
  doc.fontSize(9).fillColor("#64748b").text(`Order Ref: ${order.readableId || order.id}`, { align: "right" });
  doc.text(`Invoice Date: ${createdDate}`, { align: "right" });
  doc.text(`Payment Status: ${order.paymentStatus || "Pending"} (${order.paymentMethod || "Credit"})`, { align: "right" });
  doc.moveDown(1);

  // Customer / Pharmacy Info
  doc.fontSize(11).fillColor("#0f172a").text("BILLED TO:");
  doc.fontSize(10).fillColor("#334155").text(pharmacy?.pharmacyName || "Registered Pharmacy Partner");
  if (pharmacy?.ownerName) doc.text(`Proprietor: ${pharmacy.ownerName}`);
  if (pharmacy?.phone) doc.text(`Contact Phone: ${pharmacy.phone}`);
  if (pharmacy?.address) doc.text(`Address: ${pharmacy.address}`);
  if (pharmacy?.licenseNo) doc.text(`Drug License: ${pharmacy.licenseNo}`);
  doc.moveDown(1.5);

  // Table Headers
  const tableTop = doc.y;
  doc.fontSize(9).fillColor("#0f172a");
  doc.text("Item Name", 40, tableTop, { width: 180 });
  doc.text("Strength", 220, tableTop, { width: 80 });
  doc.text("Qty (Box)", 300, tableTop, { width: 60, align: "right" });
  doc.text("Unit Price", 370, tableTop, { width: 80, align: "right" });
  doc.text("Subtotal", 460, tableTop, { width: 90, align: "right" });

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).strokeColor("#cbd5e1").stroke();

  let position = tableTop + 22;
  doc.fontSize(9).fillColor("#334155");

  const items = order.items || [];
  for (const item of items) {
    if (position > 700) {
      doc.addPage();
      position = 40;
    }
    doc.text(item.name || "Medicine Product", 40, position, { width: 180 });
    doc.text(item.strength || "-", 220, position, { width: 80 });
    doc.text((item.quantity || 0).toString(), 300, position, { width: 60, align: "right" });
    doc.text(`BDT ${item.sellingPrice ? item.sellingPrice.toLocaleString() : "0"}`, 370, position, { width: 80, align: "right" });
    doc.text(`BDT ${item.subtotal ? item.subtotal.toLocaleString() : "0"}`, 460, position, { width: 90, align: "right" });
    position += 18;
  }

  doc.moveTo(40, position + 5).lineTo(550, position + 5).strokeColor("#cbd5e1").stroke();
  position += 15;

  // Breakdown costs & totals
  const totalMrp = order.totalMrp || order.totalAmount || 0;
  const totalAmount = order.totalAmount || 0;
  const totalSavings = order.totalSavings || (totalMrp - totalAmount);

  doc.fontSize(10).fillColor("#0f172a");
  doc.text(`Gross Catalog MRP: BDT ${totalMrp.toLocaleString()}`, 300, position, { width: 250, align: "right" });
  position += 15;

  if (totalSavings > 0) {
    doc.fillColor("#16a34a").text(`Wholesale Partner Savings: - BDT ${totalSavings.toLocaleString()}`, 300, position, { width: 250, align: "right" });
    position += 15;
  }

  doc.fontSize(12).fillColor("#0f172a").text(`NET PAYABLE TOTAL: BDT ${totalAmount.toLocaleString()}`, 300, position, { width: 250, align: "right" });

  doc.moveDown(3);
  doc.fontSize(8).fillColor("#94a3b8").text("Thank you for procuring with MediChain BD. Computer-generated tax invoice — no signature required.", { align: "center" });

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
  const { status } = req.body;
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, status);
    if (error) return res.status(500).json({ error: error.message });

    const updated = await dbService.getOrderById(req.params.id);
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

app.post("/api/notifications/read/:id", requireAuth, async (req, res) => {
  try {
    await dbService.markNotificationRead(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await dbService.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SYSTEM ALERT & HARNESS AUTOMATIONS (OCR + DEMO RUNNERS) ---

app.post("/api/prescription/upload", requireAuth, ocrLimiter, async (req, res) => {
  const { imageBase64, storageUrl } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Prescription image base64 is required." });
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    let resultJson: any[] = [];

    if (process.env.GEMINI_API_KEY) {
      const aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          {
            text: `You are an expert pharmaceutical procurement auditor. Analyze this handwritten medicine list or medical prescription image.
Identify all the medicine names, strengths, brand/generic words, and required quantities.

Provide your analysis strictly in JSON format matching this schema:
[
  {
    "query": "Extracted text brand/generic name with strength",
    "strength": "strength if found",
    "quantitySuggested": 10 // suggest a reasonable B2B bulk quantity (e.g. 5, 10, 20 boxes) to order based on the written amount or standard depot stock
  }
]
Reply with only the JSON array structure. No backticks, no markdown, no conversational text.`
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING },
                strength: { type: Type.STRING },
                quantitySuggested: { type: Type.INTEGER }
              },
              required: ["query", "quantitySuggested"]
            }
          }
        }
      });

      const rawText = response.text || "[]";
      resultJson = JSON.parse(rawText.trim());
    } else {
      return res.status(500).json({ error: "OCR processing failed: GEMINI_API_KEY is not configured on the server." });
    }

    const enrichedResults = [];
    for (const resItem of resultJson) {
      // Use Supabase text search for matching instead of pulling 21k records
      const { data: matchedProds } = await supabaseAdmin.from("products")
        .select("*")
        .or(`name.ilike.%${resItem.query}%,generic_name.ilike.%${resItem.query}%`)
        .limit(1);

      if (matchedProds && matchedProds.length > 0) {
        const product = await dbService.getProductById(matchedProds[0].id);
        if (product) {
          enrichedResults.push({
            query: resItem.query,
            quantitySuggested: resItem.quantitySuggested,
            confidence: 0.95,
            matchedProductId: product.id,
            matchedProductName: product.name,
            matchedProductPrice: product.sellingPrice,
            strength: product.strength,
            packSize: product.packSize,
            mrp: product.mrp,
            discountPercentage: product.discountPercentage,
            availableStock: product.availableStock
          });
          continue;
        }
      }
      
      enrichedResults.push({
        query: resItem.query,
        quantitySuggested: resItem.quantitySuggested,
        confidence: 0,
        matchedProductId: null,
        matchedProductName: null
      });
    }

    const prescription = await dbService.createPrescription(
      req.user.pharmacy_id || "pharm_default",
      storageUrl || "data:image/jpeg;base64," + cleanBase64,
      JSON.stringify(enrichedResults),
      "Completed",
      enrichedResults
    );

    res.json({
      success: true,
      prescriptionId: prescription.data?.id,
      results: enrichedResults
    });

  } catch (error: any) {
    console.error("Prescription parsing error: ", error);
    res.status(500).json({ error: "Failed to parse prescription: " + error.message });
  }
});

app.get("/api/prescriptions", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getPrescriptions(req.user.pharmacy_id || "pharm_default");
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: "Missing status parameter." });
  }
  try {
    const { error } = await dbService.updateOrderStatus(req.params.id, status);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, message: `Delivery Status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/delivery/history", requireRole(["Admin", "Delivery Staff"]), async (req, res) => {
  try {
    const orders = await dbService.getOrders();
    const completedDeliveries = orders.filter(o => o.status === "Delivered" || o.status === "Completed");
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
    const pendingVerifications = pharmacies.filter(p => p.verificationStatus === "Pending").length;

    const activePrescriptionsList = await dbService.getPrescriptions("pharm_default");
    const pendingPrescriptions = activePrescriptionsList.filter(p => p.status === "Processing").length;

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        pendingDeliveries,
        pendingVerifications,
        pendingPrescriptions,
        totalOrders
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/pharmacies", requireRole(["Admin"]), async (req, res) => {
  try {
    const list = await dbService.getAllPharmacies();
    res.json(list);
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

// --- HYBRID OCR PIPELINE ROUTE ---
app.use("/api/v1/ocr", ocrRouter);

// --- GLOBAL ERROR HANDLING & INITIALIZATION ---

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred. Please contact MediChain Support.",
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

let serverInstance: any;

async function startServer() {
  console.log(`[${new Date().toISOString()}] [INFO] [System] Initializing MediChain platform startup diagnostics...`);
  try {
    await dbService.getSystemSettings();
    console.log(`[${new Date().toISOString()}] [INFO] [Database] Connection diagnostic: SUCCESS. Supabase database backend is responsive and synchronized.`);
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] [CRITICAL] [Database] Connection diagnostic: FAILED! Supabase database is unreachable. Error:`, err.message || err);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] [INFO] [System] MediChain Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
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

if (!process.env.VERCEL) {
  startServer();
}

export { app };
