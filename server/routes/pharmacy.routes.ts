import { Router } from "express";
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";
import * as dbService from "../../src/lib/dbService.js";
import { requireAuth } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// Pharmacy Profile
// ---------------------------------------------------------------------------

router.get("/pharmacy/profile", requireAuth, async (req, res) => {
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
    res.json({ user, pharmacy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/pharmacy/profile", requireAuth, async (req, res) => {
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

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

router.get("/favourites/ids", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavouritesIds(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/favourites", requireAuth, async (req, res) => {
  try {
    const list = await dbService.getFavourites(req.user.id);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/favourites/toggle", requireAuth, async (req, res) => {
  const { productId } = req.body;
  try {
    const result = await dbService.toggleFavourite(req.user.id, productId);
    res.json({ success: true, isFavourite: result.isFavourite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

router.get("/notifications", requireAuth, async (req, res) => {
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

router.post("/notifications/read/:id", requireAuth, handleMarkRead);
router.patch("/notifications/read/:id", requireAuth, handleMarkRead);
router.post("/notifications/:id/read", requireAuth, handleMarkRead);
router.patch("/notifications/:id/read", requireAuth, handleMarkRead);

const handleMarkAllRead = async (req: any, res: any) => {
  try {
    await dbService.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.post("/notifications/read-all", requireAuth, handleMarkAllRead);
router.patch("/notifications/read-all", requireAuth, handleMarkAllRead);

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

router.post("/diagnostic/verify-cart-products", requireAuth, async (req, res) => {
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

export default router;
