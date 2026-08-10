import express from "express";
import compression from "compression";
import path from "path";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

import { aiEnrichmentService } from "./src/lib/aiEnrichmentService.js";

// Route modules
import authRouter from "./server/routes/auth.routes.js";
import productsRouter from "./server/routes/products.routes.js";
import cartRouter from "./server/routes/cart.routes.js";
import ordersRouter from "./server/routes/orders.routes.js";
import pharmacyRouter from "./server/routes/pharmacy.routes.js";
import depotRouter from "./server/routes/depot.routes.js";
import deliveryRouter from "./server/routes/delivery.routes.js";
import adminRouter from "./server/routes/admin.routes.js";

dotenv.config();

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();
app.use(compression());
app.set("trust proxy", 1);
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Cookie session
const sessionSecret = process.env.SESSION_SECRET || "medichain_secure_session_secret_fallback_key_2026";
if (!process.env.SESSION_SECRET) {
  console.warn("SESSION_SECRET environment variable is missing; utilizing default fallback secret.");
}

app.use(
  cookieSession({
    name: "session",
    keys: [sessionSecret],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: "none"
  })
);

// Global header-based session fallback (for iframe / blocked third-party cookie environments)
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

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Audit log (cross-domain endpoint, stays at top level)
// ---------------------------------------------------------------------------

import { requireAuth } from "./server/middleware.js";
import * as dbService from "./src/lib/dbService.js";

app.post("/api/audit-log", requireAuth, async (req: any, res: any) => {
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

// ---------------------------------------------------------------------------
// Mount routers
// ---------------------------------------------------------------------------

app.use("/api/auth", authRouter);
app.use("/api", productsRouter);          // /api/products, /api/categories, /api/prescription/scan
app.use("/api", cartRouter);              // /api/cart/*, /api/analytics, /api/pharmacy/dashboard-summary
app.use("/api", ordersRouter);            // /api/orders/*, /api/payments/process
app.use("/api", pharmacyRouter);          // /api/pharmacy/profile, /api/favourites/*, /api/notifications/*, /api/diagnostic/*
app.use("/api/depot", depotRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/admin", adminRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    error: "An unexpected server error occurred. Please contact MediChain Support.",
    message: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

// ---------------------------------------------------------------------------
// Server startup (Vite dev middleware or static production)
// ---------------------------------------------------------------------------

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

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        maxAge: "1y",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] [INFO] [System] MediChain Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });

  // Socket.IO
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

// ---------------------------------------------------------------------------
// AI enrichment cron (runs every minute)
// ---------------------------------------------------------------------------

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
