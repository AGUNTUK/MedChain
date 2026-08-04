# AGENT NOTES — QA & Testing Audit Log

## Phase 0 — Environment & Project Discovery
- **Project Name:** MediChain (B2B Pharma Procurement OS)
- **Framework:** React 19 + Express.js monolith (Vite middleware in dev, static dist in prod)
- **Package Manager:** npm
- **Port:** 3000
- **Main Entry Points:** `server.ts` (Express server & API routes), `src/App.tsx` (React application state-based routing)
- **Roles:** Pharmacy Owner, Admin, Depot Staff, Delivery Staff
- **Credentials Provided:**
  - Pharmacy Owner: `sohelrana199813@gmail.com` / `Jhanumaal1998@`

## Phase 1 — Playwright Setup
- Configured `playwright.config.ts` for chromium, firefox, and webkit.
- Base URL: `http://localhost:3000`
- Folder structure created for `tests/e2e`, `tests/visual`, `tests/a11y`, `test-results/screenshots/`.

## Phase 2 — Static Analysis
- Linter / Type Checker (`tsc --noEmit`): **Passed cleanly with 0 errors**.
- Production Build (`npm run build`): In progress / verified.
- Code Review Observations:
  - App navigation uses custom state routing (`appStep` & `activeTab` in `src/App.tsx`).
  - Public / Protected views: Splash screen, Login, Profile Setup, Home, Product Details, Search, Cart, Checkout, Order History, Order Tracking, Account, Admin Panel, Depot Dashboard, Delivery Dashboard.
  - Buttons and interactive elements utilize standard Tailwind & Lucide icons.
