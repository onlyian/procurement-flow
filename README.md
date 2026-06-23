# ProcurementFlow

An enterprise admin dashboard for inventory and procurement request management. Employees submit requests via Google Forms; procurement admins approve or reject them through a polished dashboard, with inventory stock automatically deducted on approval.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Stack & Dependencies](#stack--dependencies)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Authentication (Clerk)](#authentication-clerk)
- [Google Forms Webhook](#google-forms-webhook)
- [Codegen Workflow](#codegen-workflow)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Developer Workflows](#developer-workflows)
- [Key Design Decisions](#key-design-decisions)
- [Common Gotchas](#common-gotchas)

---

## Overview

| Feature | Description |
|---|---|
| **Request lifecycle** | Employees submit Google Form → webhook creates a `pending` request → admin approves (stock deducted atomically) or rejects |
| **Inventory CRUD** | Full create / read / update / delete for stock items with per-item low-stock thresholds |
| **Analytics dashboard** | KPI cards, Recharts bar chart of department usage, live low-stock alerts panel |
| **Transaction log** | Immutable record of every stock deduction linked to its originating request |
| **Auth** | Clerk (Replit-managed), proxy through `/api/__clerk` so the frontend never exposes the backend secret key |

---

## Architecture

```
Browser
  │
  ├── GET /          → React+Vite SPA (procurement-flow artifact)
  └── GET /api/*     → Express 5 API Server (api-server artifact)
                          │
                          ├── /api/__clerk  ← Clerk auth proxy
                          ├── /api/departments
                          ├── /api/inventory
                          ├── /api/requests
                          ├── /api/transactions
                          ├── /api/analytics/*
                          └── /api/webhook/google-forms
                                │
                                └── PostgreSQL (Drizzle ORM)
```

A global reverse proxy (managed by Replit) routes traffic by path. **No Vite proxy config is needed** — the proxy is platform-level.

The API contract lives in `lib/api-spec/openapi.yaml`. All React hooks and Zod validation schemas are **generated from it** via Orval — never write fetch calls or validation schemas by hand.

---

## Repository Layout

```
artifacts-monorepo/
│
├── artifacts/
│   ├── api-server/                 # Express 5 API
│   │   ├── src/
│   │   │   ├── app.ts              # Express app factory (Clerk middleware, JSON, error handler)
│   │   │   ├── server.ts           # HTTP server entry point
│   │   │   ├── lib/
│   │   │   │   └── logger.ts       # Pino logger singleton
│   │   │   └── routes/
│   │   │       ├── index.ts        # Mounts all sub-routers
│   │   │       ├── health.ts       # GET /api/healthz
│   │   │       ├── departments.ts  # GET /api/departments
│   │   │       ├── inventory.ts    # CRUD /api/inventory
│   │   │       ├── requests.ts     # CRUD + approve/reject /api/requests
│   │   │       ├── transactions.ts # GET /api/transactions
│   │   │       ├── analytics.ts    # GET /api/analytics/*
│   │   │       └── webhook.ts      # POST /api/webhook/google-forms
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── procurement-flow/           # React + Vite SPA
│       ├── public/
│       │   └── logo.svg            # Branded logo (used by Clerk sign-in UI)
│       ├── src/
│       │   ├── main.tsx            # Vite entry — renders <App />
│       │   ├── App.tsx             # ClerkProvider, QueryClientProvider, Wouter router
│       │   ├── index.css           # Tailwind v4 + shadcn CSS variables + Clerk layer
│       │   ├── components/
│       │   │   ├── layout-sidebar.tsx  # Persistent sidebar (nav, user avatar, sign-out)
│       │   │   └── ui/             # shadcn/ui components (Button, Badge, Dialog, etc.)
│       │   ├── pages/
│       │   │   ├── landing.tsx     # Public marketing page
│       │   │   ├── dashboard.tsx   # Analytics — KPIs, chart, low-stock panel
│       │   │   ├── inventory.tsx   # Inventory table + add/edit/delete dialogs
│       │   │   ├── requests.tsx    # Request list + approve/reject actions
│       │   │   ├── transactions.tsx# Read-only transaction log
│       │   │   └── not-found.tsx   # 404 fallback
│       │   ├── hooks/              # Custom React hooks (if any)
│       │   └── lib/
│       │       └── utils.ts        # shadcn `cn()` helper
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── lib/
│   ├── db/                         # @workspace/db — Drizzle ORM
│   │   ├── src/
│   │   │   ├── index.ts            # Exports: db client + all table refs
│   │   │   ├── client.ts           # pg Pool → Drizzle client (reads DATABASE_URL)
│   │   │   └── schema/
│   │   │       ├── index.ts        # Re-exports all tables
│   │   │       ├── departments.ts
│   │   │       ├── inventoryItems.ts
│   │   │       ├── requests.ts
│   │   │       └── transactions.ts
│   │   ├── drizzle.config.ts       # Drizzle Kit config (points at DATABASE_URL)
│   │   └── package.json
│   │
│   ├── api-spec/                   # @workspace/api-spec — OpenAPI + Orval
│   │   ├── openapi.yaml            # ← SOURCE OF TRUTH for the entire API contract
│   │   ├── orval.config.ts         # Orval config: generates hooks + Zod schemas
│   │   └── package.json
│   │
│   ├── api-client-react/           # @workspace/api-client-react — generated React Query hooks
│   │   └── src/generated/
│   │       ├── api.ts              # All useXxx() hooks + getXxxQueryKey() helpers
│   │       └── api.schemas.ts      # TypeScript types from OpenAPI
│   │
│   └── api-zod/                    # @workspace/api-zod — generated Zod schemas
│       └── src/generated/
│           └── api.zod.ts          # Zod validators for every request body + query param
│
├── scripts/                        # @workspace/scripts — utility scripts
├── pnpm-workspace.yaml             # Workspace package discovery + catalog pins
├── tsconfig.base.json              # Shared strict TypeScript config
├── tsconfig.json                   # Solution file (libs only)
└── package.json                    # Root dev tooling (typescript, prettier, eslint)
```

---

## Stack & Dependencies

| Layer | Technology |
|---|---|
| Package manager | pnpm workspaces |
| Language | TypeScript 5.9 (strict) |
| Runtime | Node.js 24 |
| Frontend framework | React 18 + Vite |
| Routing (frontend) | Wouter |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Server-side data fetching | TanStack Query (React Query v5) |
| Toasts | Sonner |
| Forms | react-hook-form + @hookform/resolvers/zod |
| Auth | Clerk (`@clerk/react`, `@clerk/express`) |
| API server | Express 5 |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| API contract | OpenAPI 3.1 → Orval codegen |
| Logging | Pino (`req.log` in handlers, `logger` singleton elsewhere) |
| Build | esbuild (API server, CJS bundle) |

---

## Database Schema

All tables live in `lib/db/src/schema/`. Push changes with `pnpm --filter @workspace/db run push`.

### `departments`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | auto-increment |
| `name` | `text` NOT NULL | department name |

### `inventory_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `name` | `text` NOT NULL | display name |
| `sku` | `text` NOT NULL UNIQUE | stock-keeping unit |
| `stock_level` | `integer` NOT NULL | current quantity on hand |
| `unit_price` | `numeric` NOT NULL | stored as Postgres `numeric`; serialized to `float` in API responses |
| `category` | `text` NOT NULL | e.g. "Electronics", "Furniture" |
| `low_stock_threshold` | `integer` NOT NULL | alert fires when `stock_level <= low_stock_threshold` |
| `created_at` | `timestamp` | default `now()` |

### `requests`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `employee_email` | `text` NOT NULL | submitter |
| `department_id` | `integer` FK → `departments.id` | |
| `item_id` | `integer` FK → `inventory_items.id` | |
| `quantity` | `integer` NOT NULL | how many units requested |
| `status` | `text` NOT NULL | `pending` / `approved` / `rejected` / `fulfilled` |
| `created_at` | `timestamp` | default `now()` |

### `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | `serial` PK | |
| `request_id` | `integer` FK → `requests.id` | originating request |
| `item_id` | `integer` FK → `inventory_items.id` | |
| `department_id` | `integer` FK → `departments.id` | |
| `quantity_deducted` | `integer` NOT NULL | mirrors `requests.quantity` at approval time |
| `timestamp` | `timestamp` | default `now()` |

---

## API Reference

All routes are prefixed `/api`. The server reads `DATABASE_URL` and uses Drizzle for all queries. Validation uses generated Zod schemas from `@workspace/api-zod`.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Returns `{ status: "ok" }` |

### Departments

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/departments` | List all departments, ordered by name |

### Inventory

| Method | Path | Query params | Body | Description |
|---|---|---|---|---|
| `GET` | `/api/inventory` | `category?: string`, `lowStock?: boolean` | — | List items; filter by category or at/below threshold |
| `POST` | `/api/inventory` | — | `{ name, sku, stockLevel, unitPrice, category, lowStockThreshold }` | Create item |
| `GET` | `/api/inventory/:id` | — | — | Get single item |
| `PATCH` | `/api/inventory/:id` | — | partial item fields | Update item |
| `DELETE` | `/api/inventory/:id` | — | — | Delete item (204) |

### Requests

| Method | Path | Query params | Body | Description |
|---|---|---|---|---|
| `GET` | `/api/requests` | `status?: pending\|approved\|rejected\|fulfilled`, `departmentId?: number` | — | List requests with joined item + department names |
| `POST` | `/api/requests` | — | `{ employeeEmail, departmentId, itemId, quantity }` | Create pending request |
| `GET` | `/api/requests/:id` | — | — | Get single request |
| `POST` | `/api/requests/:id/approve` | — | — | Approve request; atomically deducts stock; logs transaction |
| `POST` | `/api/requests/:id/reject` | — | — | Reject request (status → `rejected`) |

**Stock deduction is atomic:** a single `UPDATE inventory_items SET stock_level = stock_level - qty WHERE id = ? AND stock_level >= qty` is used. If zero rows are updated, the API returns `400 Insufficient stock` without touching the request status.

### Transactions

| Method | Path | Query params | Description |
|---|---|---|---|
| `GET` | `/api/transactions` | `departmentId?: number`, `itemId?: number` | List transactions with joined names, newest first |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard` | `{ totalRequests, pendingRequests, approvedRequests, rejectedRequests, totalInventoryItems, lowStockCount, totalInventoryValue }` |
| `GET` | `/api/analytics/department-usage` | `[{ departmentId, departmentName, totalQuantity, totalRequests }]` — aggregated from `transactions` |
| `GET` | `/api/analytics/low-stock` | Items where `stock_level <= low_stock_threshold`, ordered by stock level ascending |

### Webhook

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/webhook/google-forms` | `{ employeeEmail, departmentName, itemName, quantity }` | Finds or creates department by name, looks up item by name, creates pending request. Always returns HTTP 200 to suppress Google retry spam. |

---

## Frontend Pages

All protected pages are wrapped in `<SidebarLayout>` (persistent sidebar with navigation, user avatar, and sign-out). Unauthenticated users are redirected to `/sign-in`.

### `/` — Landing (`pages/landing.tsx`)

Public page. Hero section, feature highlights, stats strip, CTA. Signed-in users who visit `/` are redirected to `/dashboard` via Clerk's `<Show when="signed-in">`.

### `/sign-in` and `/sign-up`

Clerk-rendered auth UI, styled to match the app theme using `@clerk/themes/shadcn` and a custom appearance object in `App.tsx`.

### `/dashboard` — Dashboard (`pages/dashboard.tsx`)

- **KPI cards** (7): total requests, pending, approved, rejected, inventory items, low-stock count, total inventory value
- **Department Usage bar chart** (Recharts `BarChart`): X = department name, Y = total items deducted
- **Low Stock Alerts panel**: items at or below threshold, with stock-level badges

Data sources: `useGetDashboardSummary()`, `useGetDepartmentUsage()`, `useGetLowStockItems()`

### `/inventory` — Inventory (`pages/inventory.tsx`)

- Searchable (by name/SKU) and filterable (by category) table
- Low-stock rows highlighted in amber
- **Add item** dialog — controlled form with all fields, submitted via `useCreateInventoryItem()`
- **Edit item** dialog — pre-populated form, submitted via `useUpdateInventoryItem()`
- **Delete** confirmation `AlertDialog` — uses `useDeleteInventoryItem()`
- Cache invalidated via `queryClient.invalidateQueries({ queryKey: getListInventoryItemsQueryKey() })` on every mutation

### `/requests` — Requests (`pages/requests.tsx`)

- Status filter tabs: All / Pending / Approved / Rejected / Fulfilled
- Pending requests sorted to the top and highlighted in amber
- **Approve** button → `useApproveRequest()` → toast + invalidates requests, dashboard summary, and inventory (stock changed)
- **Reject** button → `useRejectRequest()` → toast
- Insufficient-stock errors are surfaced in the toast from the API's `400` response body

### `/transactions` — Transactions (`pages/transactions.tsx`)

Read-only, sorted newest-first. Shows item name, department, quantity deducted (displayed as `−N`), linked request ID, and timestamp.

---

## Authentication (Clerk)

Clerk is provisioned and managed by Replit. Key wiring points:

| Concern | Location | Detail |
|---|---|---|
| Proxy URL | `app.ts` | `clerkProxyMiddleware` forwards all `/api/__clerk/**` requests to Clerk's backend — the frontend never talks to Clerk directly |
| Publishable key | `App.tsx` | `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` — handles Replit's multi-domain proxying |
| Proxy URL (frontend) | `App.tsx` | `proxyUrl={import.meta.env.VITE_CLERK_PROXY_URL}` — unconditional, no `NODE_ENV` gate |
| CSS layer order | `index.css` | `@layer theme, base, clerk, components, utilities;` must appear before `@import "tailwindcss"` so Clerk styles don't override Tailwind utilities |
| Theme | `App.tsx` | `shadcn` from `@clerk/themes` + custom `variables` and `elements` to match the blue/slate palette |
| Auth guard | `App.tsx` | `<Show when="signed-in">` / `<Show when="signed-out">` — no custom hooks needed |
| User info | Any component | `const { user } = useUser()` — used in `layout-sidebar.tsx` for avatar + email |
| Sign-out | Sidebar | `const { signOut } = useClerk(); signOut()` |

**Do not use `<UserButton />`** — it embeds Clerk's UI which conflicts with the custom sidebar design.

---

## Google Forms Webhook

Configure Google Forms → Apps Script → send a `POST` to `/api/webhook/google-forms` with:

```json
{
  "employeeEmail": "alice@company.com",
  "departmentName": "Engineering",
  "itemName": "MacBook Pro 14\"",
  "quantity": 1
}
```

The endpoint:
1. Finds the department by name (case-insensitive `ILIKE`), or creates it if it doesn't exist yet
2. Finds the inventory item by name (`ILIKE`)
3. Inserts a `pending` request

Always returns HTTP 200 — errors are logged server-side via Pino so Google doesn't retry.

---

## Codegen Workflow

The API contract drives everything. The workflow is:

```
Edit lib/api-spec/openapi.yaml
        │
        ▼
pnpm --filter @workspace/api-spec run codegen
        │
        ├── lib/api-client-react/src/generated/api.ts          (React Query hooks)
        ├── lib/api-client-react/src/generated/api.schemas.ts  (TypeScript types)
        └── lib/api-zod/src/generated/api.zod.ts               (Zod validators)
```

After codegen, **no separate typecheck:libs run is needed** — Orval writes `.ts` files directly.

However, if you edit Drizzle schema files in `lib/db/`, you must run:

```bash
pnpm run typecheck:libs   # rebuilds lib declarations so artifacts can see new exports
```

---

## Environment Variables

| Variable | Where set | Description |
|---|---|---|
| `DATABASE_URL` | Replit secret | PostgreSQL connection string |
| `SESSION_SECRET` | Replit secret | Express session secret |
| `CLERK_SECRET_KEY` | Replit secret (Clerk integration) | Backend Clerk secret — never exposed to the browser |
| `VITE_CLERK_PUBLISHABLE_KEY` | Replit secret (Clerk integration) | Frontend publishable key |
| `VITE_CLERK_PROXY_URL` | Replit secret (Clerk integration) | Frontend proxy URL (e.g. `https://<domain>/api/__clerk`) |
| `PORT` | Workflow env | Port each artifact's dev server binds to (set by Replit workflow config) |
| `BASE_PATH` | Workflow env | URL base path for the artifact |

---

## Running Locally

> These steps assume you are running on Replit. For a local machine, you must provide your own Postgres instance and Clerk app.

**1. Install dependencies**

```bash
pnpm install
```

**2. Push the database schema**

```bash
pnpm --filter @workspace/db run push
```

**3. Start both services** (done automatically by Replit workflows):

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/procurement-flow run dev
```

Both are wired as Replit workflows — use the workflow panel to start/stop them.

---

## Developer Workflows

| Task | Command |
|---|---|
| Full typecheck | `pnpm run typecheck` |
| Typecheck libs only | `pnpm run typecheck:libs` |
| Typecheck API server | `pnpm --filter @workspace/api-server run typecheck` |
| Typecheck frontend | `pnpm --filter @workspace/procurement-flow run typecheck` |
| Regenerate API hooks + Zod | `pnpm --filter @workspace/api-spec run codegen` |
| Push DB schema | `pnpm --filter @workspace/db run push` |
| Build all | `pnpm run build` |

**Typical change cycle:**

```
Edit openapi.yaml → codegen → edit routes → typecheck api-server
Edit schema/*.ts  → push     → typecheck:libs → edit routes → typecheck api-server
Edit pages/*.tsx  → typecheck frontend
```

---

## Key Design Decisions

### 1. Contract-first API with full codegen

The `openapi.yaml` is the single source of truth. Orval generates typed React Query hooks for the frontend and Zod schemas for the backend. Adding a new endpoint means:
- Add it to `openapi.yaml`
- Run codegen
- Implement the route using the generated Zod schema for validation

This eliminates an entire class of frontend/backend type drift bugs.

### 2. Atomic stock deduction

```sql
UPDATE inventory_items
SET stock_level = stock_level - $quantity
WHERE id = $itemId
  AND stock_level >= $quantity
```

This single statement is atomic at the Postgres level. If it updates 0 rows, stock was insufficient. No transactions, no locks, no race conditions.

### 3. Clerk proxy pattern

The frontend sends all auth requests to `/api/__clerk` (the API server), which forwards them to Clerk's servers. This keeps the Clerk Secret Key exclusively on the server. The frontend only ever holds the Publishable Key.

### 4. `numeric` → `float` serialization

Postgres `numeric` columns are returned as strings by the `pg` Node driver. All route handlers that return `unitPrice` call `parseFloat(item.unitPrice)` before sending JSON, so clients always receive a number.

### 5. Webhook fault tolerance

The Google Forms webhook always returns HTTP 200, even on validation errors or internal failures. This prevents Google from queuing retries that would create duplicate requests. All errors are logged via Pino for offline debugging.

---

## Common Gotchas

- **Stale lib declarations:** After changing any file in `lib/db/`, always run `pnpm run typecheck:libs` before checking artifacts. The error looks like `Module '@workspace/db' has no exported member 'xyzTable'` — it means the `.d.ts` files are outdated.

- **Never `pnpm dev` at workspace root:** The root `package.json` has no `dev` script by design. Each artifact needs `PORT` and `BASE_PATH` env vars that are only wired by the Replit workflow config.

- **Orval output is committed:** The generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` are committed to the repo. Regenerate them whenever `openapi.yaml` changes.

- **Do not change `info.title` in `openapi.yaml`:** Orval uses it to derive generated file names. Changing it will break existing import paths.

- **Clerk dev keys:** The app runs with Clerk development keys on Replit. These have strict rate limits and should not be used in production. See Clerk's deployment docs before going live.

- **Verify routes through the proxy:** Always test API endpoints via `localhost:80/api/...` (the shared proxy), never by hitting the API server's port directly. The paths are not rewritten by the proxy.
