import { Router } from "express";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";
import * as dbService from "../../src/lib/dbService.js";
import { requireAuth, requireVerifiedPharmacy } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Procurement Cart (stateless, DB-synced)
// ---------------------------------------------------------------------------

router.get("/cart", requireAuth, async (req, res) => {
  try {
    const cartItemsInDb = await dbService.getCart(req.user.id);
    const cartItems: any[] = [];
    let cartModified = false;

    if (cartItemsInDb.length > 0) {
      const productIds = cartItemsInDb.map((item: any) => item.productId);

      const { data: dbProducts, error } = await supabaseAdmin
        .from("products")
        .select("*, inventory(available_stock, reserved_stock, sold_stock, batch_number, expiry_date)")
        .in("id", productIds);

      if (!error && dbProducts) {
        const productMap = new Map();
        dbProducts.forEach((p: any) => {
          const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
          let sellingVal = 0;
          if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
            sellingVal = parseFloat(p.selling_price);
          } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
            sellingVal = parseFloat(p.sellingPrice);
          } else {
            sellingVal = mrpVal;
          }

          const inv = Array.isArray(p.inventory) && p.inventory.length > 0 ? p.inventory[0] : p.inventory || null;
          const stockVal =
            p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
              ? parseInt(p.stock_quantity, 10)
              : inv
              ? inv.available_stock ?? 0
              : p.availableStock ?? 0;

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
            imageUrl: p.image_url || p.imageUrl || undefined
          });
        });

        for (const item of cartItemsInDb) {
          const product = productMap.get(item.productId);
          if (product) {
            cartItems.push({ product, quantity: item.quantity });
          } else {
            cartModified = true;
          }
        }
      } else {
        cartModified = true;
      }
    }

    if (cartModified) {
      await dbService.saveCart(
        req.user.id,
        cartItems.map(c => ({ productId: c.product.id, quantity: c.quantity }))
      );
    }

    const totalMrp = cartItems.reduce((acc, item) => acc + item.product.mrp * item.quantity, 0);
    const totalAmount = cartItems.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
    const totalSavings = totalMrp - totalAmount;

    res.json({ items: cartItems, totalMrp, totalAmount, totalSavings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/cart/add", requireAuth, requireVerifiedPharmacy, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const product = await dbService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const dbCart = await dbService.getCart(req.user.id);
    const existing = dbCart.find((c: any) => c.productId === productId);
    const totalQty = (existing ? existing.quantity : 0) + quantity;

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

router.post("/cart/update", requireAuth, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const dbCart = await dbService.getCart(req.user.id);
    const item = dbCart.find((c: any) => c.productId === productId);
    const product = await dbService.getProductById(productId);

    if (!item || !product) {
      return res.status(404).json({ error: "Cart item or product not found." });
    }

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

router.post("/cart/remove", requireAuth, async (req, res) => {
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

router.post("/cart/clear", requireAuth, async (req, res) => {
  try {
    await dbService.saveCart(req.user.id, []);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Analytics (pharmacy-scoped)
// ---------------------------------------------------------------------------

router.get("/analytics", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({ totalPurchase: 0, activeCredit: 0, dueAmount: 0, totalSavings: 0, ordersTrend: [] });
    }

    const orders = await dbService.getOrders(pharmacy.id);
    const totalPurchase = orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const totalSavings = orders.reduce((sum: number, o: any) => sum + (o.totalSavings || 0), 0);

    const ordersTrend = orders.slice(-7).map((o: any) => ({
      date: new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
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

// ---------------------------------------------------------------------------
// Pharmacy dashboard summary
// ---------------------------------------------------------------------------

router.get("/pharmacy/dashboard-summary", requireAuth, async (req, res) => {
  try {
    const pharmacy = await dbService.getPharmacyProfile(req.user.id);
    if (!pharmacy) {
      return res.json({ totalOrders: 0, monthlyPurchase: 0, creditLimit: 0, outstandingDue: 0, savedAmount: 0 });
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

export default router;
