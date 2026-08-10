import * as dbService from "../src/lib/dbService.js";

// ---------------------------------------------------------------------------
// In-memory rate-limit store
// ---------------------------------------------------------------------------

export const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: { windowMs: number; max: number; message: string }) {
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

export const loginLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many login attempts. Please try again after 1 minute."
});

export const importLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many catalog imports. Please try again after 1 minute."
});

// ---------------------------------------------------------------------------
// Auth / Session middleware
// ---------------------------------------------------------------------------

export function requireAuth(req: any, res: any, next: any) {
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

export function requireRole(allowedRoles: string[]) {
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

export async function requireVerifiedPharmacy(req: any, res: any, next: any) {
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
