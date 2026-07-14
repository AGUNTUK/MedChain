# 🛡️ MediChain — Premium B2B Pharma Procurement OS

MediChain is a high-performance, secure, enterprise-grade B2B pharmaceutical procurement operating system designed to streamline bulk wholesale drug ordering, batch tracking, and logistics fulfillment for licensed retail pharmacies.

This repository contains the complete full-stack codebase of MediChain, fully audited, secured, and **Supabase-Ready** for production-grade deployment and instant GitHub export.

---

## 📖 Project Overview

Local pharmacies frequently suffer from highly fragmented supply chains, forcing them to coordinate with 20 to 30 separate pharmaceutical manufacturing depots daily to maintain critical drug stock. MediChain solves this fragmentation by acting as a single, centralized procurement aggregator, integrating dynamic searching, real-time FEFO inventory validation, B2B digital credit accounts, and intelligent optical prescription scanning into a unified, high-speed interface.

---

## 💼 Business Model

MediChain operates on a modern, high-volume **B2B Aggregation & Fulfillment Model**:

$$\text{Pharma Manufacturers (Beximco, Square, Incepta)} \longrightarrow \text{MediChain Central Depot} \longrightarrow \text{Licensed Retail Pharmacies}$$

### Core Value Drivers:
1. **Unified SKU Aggregation**: Retail pharmacies see only MediChain as their single point of purchase and logistics delivery, eliminating the administrative overhead of coordinating separate invoices, payments, and delivery drivers for each pharma manufacturer.
2. **Bulk Rebate Distribution**: By leveraging aggregate wholesale ordering volumes, MediChain secures bulk tier discounts directly from manufacturers and passes significant rebates (typically 10% to 25% off MRP) down to retail pharmacies, increasing their thin retail margins.
3. **Optimized FEFO Logistics**: MediChain utilizes a strict **FEFO (First Expiry First Out)** warehousing workflow, routing orders to batches with the earliest expiry dates. This maximizes shelf longevity for retail pharmacies while preventing expensive product write-offs for manufacturers.

---

## ✨ Features & Capabilities

- **⚡ Instant Procurement Engine**: Full-text searching across brand names, generic formulas, and manufacturing companies with advanced phonetic typo tolerance and instant autocomplete suggestions.
- **📦 Smart Quantity Controls**: Interactive bulk quantity selection presets (10, 50, 100, 200 boxes) with live subtotal calculation, available stock boundary validation, and real-time inventory updates.
- **🔄 Past Invoice 1-Tap Reorders**: Instant history retrieval allowing busy pharmacy owners to duplicate past order lines into their active cart in a single tap, bypassing standard browsing steps.
- **🧾 Intelligent Optical Prescription Scanning**: Powered by **Google Gemini AI** (server-side via official `@google/genai` SDK), allowing pharmacies to upload patient prescription sheets and automatically map hand-written formulas to real, purchasable wholesale inventory SKUs with confidence matching.
- **💳 B2B Credit Line Accounts**: Integrated credit facilities validating available credit balance against checkout amounts to support flexible cash-on-delivery and deferred invoice settlement.
- **🚚 Dual-State Role Dashboards**: Pre-wired pathways supporting separate views for Pharmacy Owners (procurement, returns, ledger), Depot Staff (packing, batch numbering, FEFO inventory, expiry audits), and Delivery Express Couriers (assigned dropoffs, OTP-validated deliveries).

---

## 🛠️ Technology Stack

- **Frontend**: React 18 (with React 19 forward-compatible APIs), Vite, TypeScript, Tailwind CSS, Motion (Fluid UI micro-interactions and transitions)
- **Backend**: Node.js, Express (Single, compiled, production-bundled server utilizing esbuild)
- **Database**: PostgreSQL (Supabase native) with local file-based persistent JSON failover fallback for isolated local-dev/preview testing
- **AI Core**: Google Gemini Pro (accessed via modern, secure, server-side `@google/genai` SDK)
- **Design & Icons**: Lucide React vector suite with responsive, high-contrast typography (`Inter` paired with mathematical data representation in `JetBrains Mono`)

---

## ⚙️ Environment Configuration

To configure MediChain for production, rename `.env.example` to `.env` in the root directory and populate your credentials:

```env
# Server Ingress Settings
PORT=3000
NODE_ENV=production

# Server-Side Google Gemini AI Key (Never exposed to browser/client-side)
GEMINI_API_KEY="your_google_gemini_api_key_here"

# Public Client-Side Supabase Keys (Exposed to Vite bundle)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your_public_client_anon_key_here"

# Secure Backend Supabase Service Role Key (Exposed only to backend Node runtime)
SUPABASE_SERVICE_ROLE_KEY="your_backend_supabase_service_role_key_here"

# Self-referential URL of the hosting environment
APP_URL="https://your-deployed-app.com"
```

---

## 📦 Installation & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** package manager

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
The server will start on **`http://localhost:3000`** and automatically load development data from `/src/db-store.json`.

### 4. Build for Production
To build the React Single Page App assets and bundle the Express backend into a single, optimized, self-contained CommonJS script (`dist/server.cjs`) using esbuild:
```bash
npm run build
```

### 5. Start Production server
```bash
npm run start
```

---

## 🚀 Supabase Database Provisioning

The complete relational schema mapping is located in [**`supabase-schema.sql`**](./supabase-schema.sql) at the root level. Follow these steps to provision your Supabase instance:

1. **Create Supabase Project**: Login to [Supabase](https://supabase.com) and create a new PostgreSQL database project.
2. **Execute Schema SQL**: Go to the **SQL Editor** tab in the Supabase Dashboard, create a new query, paste the contents of `supabase-schema.sql`, and click **Run**. This will build:
   - All relational tables (`users`, `pharmacies`, `products`, `inventory`, `orders`, `order_items`, `credit_accounts`, `prescriptions`, `returns`, etc.)
   - Comprehensive multi-column query performance indexes (`idx_inventory_expiry`, `idx_products_name_generic`, etc.)
   - Automated timestamp triggers to keep table rows synchronized.
   - Row Level Security (RLS) policies isolating user profiles, orders, and credit information.
3. **Retrieve Keys**: Navigate to **Project Settings > API** in Supabase and copy your `Project URL`, `anon public key`, and `service_role secret key`.
4. **Apply Env Variables**: Input these keys in your production environment as defined in the **Environment Configuration** section of this document.

---

## 🔮 Future Admin Portal Integration Guide

MediChain has been built from the ground up to support rapid B2B administrative expansion. Inside `server.ts`, a robust set of secure API routing groups starting with `/api/admin/*`, `/api/depot/*`, and `/api/delivery/*` are preconfigured and protected by role-based access control (RBAC) middleware:

### Middleware Enforcement:
```ts
function requireRole(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!db.currentUser) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!hasRole(db.currentUser, allowedRoles)) {
      return res.status(403).json({ error: "Access Denied." });
    }
    next();
  };
}
```

### Ready-to-Connect Admin Endpoints:
1. **Catalog & Inventory Control**: 
   - `GET /api/admin/pharmacies` (Requires role: `Admin`): Retrieve physical licenses and owner metrics for onboarding verification.
   - `POST /api/admin/products` (Requires role: `Admin`): Inject new medicine entries.
   - `POST /api/admin/products/import` (Requires role: `Admin`): Bulk catalog import matching standard pharma Excel datasets.
   - `POST /api/admin/prices` (Requires role: `Admin`): Global wholesale price adjustment engine.
2. **Credit Line Control**:
   - `POST /api/admin/credit-accounts` (Requires role: `Admin`): Adjust pharmacy credit limit lines based on payment histories.
3. **Depot Operations**:
   - `GET /api/depot/assigned-orders` (Requires roles: `Admin` or `Depot Staff`): View orders ready for batch packaging.
   - `POST /api/depot/update-packing` (Requires roles: `Admin` or `Depot Staff`): Transition orders from `Processing` to `Packed` with specified FEFO warehouse shelf IDs.
4. **Delivery Management**:
   - `GET /api/delivery/assigned-deliveries` (Requires roles: `Admin` or `Delivery Staff`): Route optimization coordinates for dropoffs.
   - `POST /api/delivery/update-status` (Requires roles: `Admin` or `Delivery Staff`): Update status to `Out for Delivery` and finalize transactions as `Delivered` upon verified mobile SMS OTP entry.

### Recommended Integration Architecture:
To build out the dedicated Admin Console interface, you can deploy a separate React/Vite dashboard client application hosted on a different subdomain (e.g. `admin.medichain.com`) that authenticates admins using secure OTP. This admin application can safely call the pre-wired administrative routes on the backend, ensuring full administrative control over catalog seeding, credit validation, inventory FEFO audits, and delivery logs.

---

## 🛡️ Production Security & Quality Assurances

1. **No Client-Side Secrets**: All communication with third-party keys (like Gemini AI) is fully proxied via secure server-side routes, protecting API keys from exposure in browser bundles.
2. **Global Fail-Safe Catching**: Configured global Express error handlers prevent server-side stack trace exposure to API clients during runtime failures, ensuring a highly polished API response footprint.
3. **Rigorous Linter Checks**: The entire full-stack application builds cleanly under strict TypeScript configuration (`tsc --noEmit`), with no unresolved type errors, missing declarations, or package warnings.
