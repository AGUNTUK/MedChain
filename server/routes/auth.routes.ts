import { Router } from "express";
import bcrypt from "bcryptjs";
import * as dbService from "../../src/lib/dbService.js";
import { loginLimiter } from "../middleware.js";

const router = Router();

// ---------------------------------------------------------------------------
// In-memory local user store (offline / development auth proxy)
// ---------------------------------------------------------------------------

export const localUsersStore = new Map<string, any>();

// Seed default accounts with bcrypt hashes on startup
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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.post("/local-signup", loginLimiter, async (req, res) => {
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

router.post("/local-login", loginLimiter, async (req, res) => {
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

router.post("/sync-session", loginLimiter, async (req, res) => {
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

router.post("/logout", (req, res) => {
  req.session = null;
  res.json({ success: true });
});

export default router;
