# ProcurementFlow

An enterprise admin dashboard for inventory and procurement request management.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, Wouter, Recharts
- Auth: Clerk (Replit-managed, proxy via `/api/__clerk`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/procurement-flow/` — React+Vite frontend (served at `/`)
- `artifacts/api-server/` — Express 5 API (served at `/api`)
- `lib/db/` — Drizzle ORM schema + DB client (`@workspace/db`)
- `lib/api-spec/` — OpenAPI spec + Orval codegen config
- `lib/api-client-react/` — Generated React Query hooks (`@workspace/api-client-react`)
- `lib/api-zod/` — Generated Zod validation schemas (`@workspace/api-zod`)

## DB Tables

- `departments` — id, name
- `inventory_items` — id, name, sku, stock_level, unit_price, category, low_stock_threshold, created_at
- `requests` — id, employee_email, department_id, item_id, quantity, status (pending/approved/rejected/fulfilled), created_at
- `transactions` — id, request_id, item_id, department_id, quantity_deducted, timestamp

## API Routes

- `GET /api/healthz` — health check
- `GET /api/departments` — list departments
- `GET/POST /api/inventory` — list / create inventory items
- `GET/PATCH/DELETE /api/inventory/:id` — get / update / delete item
- `GET/POST /api/requests` — list / create requests
- `GET /api/requests/:id` — get request
- `POST /api/requests/:id/approve` — approve request (deducts stock atomically)
- `POST /api/requests/:id/reject` — reject request
- `GET /api/transactions` — list fulfilled transactions
- `GET /api/analytics/dashboard` — KPI summary
- `GET /api/analytics/department-usage` — usage by department
- `GET /api/analytics/low-stock` — items at or below threshold
- `POST /api/webhook/google-forms` — accept Google Form submissions

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed hooks + Zod schemas used by both server and client. Never write fetch calls by hand.
- **Atomic stock deduction**: `UPDATE inventory_items SET stock_level = stock_level - qty WHERE stock_level >= qty` — races are impossible because only one UPDATE wins.
- **Clerk proxy**: All Clerk requests go through `/api/__clerk` via the Express middleware so the frontend never leaks the backend Clerk secret key.
- **Postgres `numeric` → float**: `unitPrice` is stored as Postgres `numeric` (returned as string by pg driver) and serialized to `float` in route handlers before sending JSON.
- **Webhook fault tolerance**: Google Forms webhook always returns HTTP 200 to prevent Google retry spam. Errors are logged only.

## Product

ProcurementFlow is used by procurement admins to:
- Process employee supply requests (approve → stock deducted, transaction logged; or reject)
- Manage the inventory catalog (CRUD with low-stock alerts)
- Monitor analytics: KPI cards, department usage bar chart, low-stock panel
- Receive Google Form submissions as pending requests via webhook

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing DB schema, run `pnpm --filter @workspace/db run push` then `pnpm run typecheck:libs`
- After changing the OpenAPI spec, run `pnpm --filter @workspace/api-spec run codegen` — this regenerates both `api-client-react` and `api-zod`
- `pnpm run typecheck:libs` must run before artifact typechecks when lib declarations are stale
- Do NOT run `pnpm dev` at workspace root — use workflow restarts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
