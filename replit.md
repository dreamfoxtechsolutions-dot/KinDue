# Workspace

## Overview

Kindue V1 — a caregiver-safe household bill coordination web app.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (`@clerk/react` v6 for frontend, `@clerk/express` for backend)
- **Frontend**: React + Vite + TailwindCSS v4 + shadcn/ui + wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- `artifacts/web` — Kindue web app (React/Vite at `/`)
- `artifacts/api-server` — Express API server (`/api/*`)
- `artifacts/mobile` — KinDue mobile app (Expo/React Native at `/mobile/`)

## Kindue Web Pages

- `/sign-in` — Clerk sign-in page
- `/sign-up` — Clerk sign-up page
- `/` — Dashboard (protected)
- `/bills` — Bills list + create
- `/bills/:id` — Bill detail + approve/reject/payments
- `/triage` — Risk triage overview
- `/accounts` — Plaid-linked financial accounts
- `/documents` — Document/receipt management
- `/household` — Household + members + roles
- `/audit` — Full audit log
- `/settings` — Account settings + integrations
- `/onboarding` — First-time setup flow

## 4-Role System

- **Primary User** — Full access, approves bills, manages household
- **Trustee** — Can approve bills, view financial accounts
- **Caregiver** — Can view and record payments (receipt required)
- **Other** — Read-only + payments with receipt enforcement

## DB Schema

Located in `lib/db/src/schema/`:
- `users` — Clerk users mirrored to DB
- `households`, `household_members` — household + role-based members
- `bills`, `bill_payments` — bill CRUD + payment tracking
- `documents` — file attachments linked to bills/payments
- `triage_results` — AI risk assessments
- `gmail_connections` — Gmail OAuth for bill scanning
- `plaid_items`, `plaid_accounts` — Plaid bank connections
- `audit_logs` — immutable action log
- `notification_settings` — per-user push/email prefs

## KinDue Mobile App

Located in `artifacts/mobile/`. Expo SDK 54, React Native.

### Mobile Screens
- `(auth)/sign-in` — Email + Google OAuth sign-in
- `(auth)/sign-up` — Email + Google OAuth sign-up with email verification
- `(home)/(tabs)/index` — Dashboard (overview stats, priority triage)
- `(home)/(tabs)/bills` — Bills list (filter by status, create new bill)
- `(home)/(tabs)/profile` — Profile, household info, role badge, sign out
- `(home)/bills/[id]` — Bill detail: approve, reject, mark paid, delete
- `(home)/household/setup` — Create new household

### Mobile Auth
- Uses `@clerk/expo` with `tokenCache` from `@clerk/expo/token-cache`
- `setAuthTokenGetter` wired in `(home)/_layout.tsx`
- `setBaseUrl` called at root module level in `app/_layout.tsx`

### Mobile State
- `context/householdStore.tsx` — persists selected household ID via AsyncStorage

## API Route Architecture

The API has two layers of routes:
- **Household-scoped routes** (original): `GET /api/households/:id/bills`, `GET /api/households/:id/triage`, etc.
- **Shortcut routes** (`artifacts/api-server/src/routes/shortcuts.ts`): convenience routes the frontend uses directly, which look up the user's primary household automatically:
  - `GET /api/bills`, `POST /api/bills` — user's household bills
  - `GET /api/bills/:id`, `POST /api/bills/:id/approve`, `POST /api/bills/:id/reject`
  - `GET /api/bills/:id/payments`, `POST /api/bills/:id/payments`
  - `GET /api/households/mine`, `GET /api/households/mine/members`
  - `POST /api/households/mine/members/invite`
  - `GET /api/triage`, `POST /api/triage/run`
  - `GET /api/audit`, `GET /api/documents`
- Shortcut routes also normalize bill field names between frontend (`title`, `due_date`, `frequency`) and DB (`name`, `dueDate`, `recurrence`)

## Important Notes

- Clerk frontend: use `@clerk/react` (NOT `@clerk/clerk-react`) for imports
- Vite `fs.strict` set to `false` to allow pnpm symlinked packages
- API routes all require Bearer token from Clerk via `requireAuth` middleware
- `requireAuth` uses `onConflictDoUpdate` to handle race conditions when new users make simultaneous requests (prevents duplicate key errors)
- `logAudit()` utility used throughout routes for full audit trail
- Shortcut routes registered BEFORE household-scoped routes so `/api/households/mine` is matched before `/api/households/:householdId`
- All route handlers use `res.json(...); return;` pattern (not `return res.json(...)`) to satisfy `noImplicitReturns: true` TypeScript setting
- All `req.params` values cast with `String(req.params["key"])` to satisfy TypeScript strict typing
- `lib/object-storage-web/tsconfig.json` has `composite: true` to enable project references from `artifacts/web`

## E2E Testing

Playwright tests live in `artifacts/web/e2e/` and run with:
```
cd artifacts/web && PLAYWRIGHT_BROWSERS_PATH=/home/runner/.cache/ms-playwright E2E_PORT=22333 E2E_API_PORT=8080 pnpm test:e2e
```

- `playwright.config.ts` — Playwright config (Chromium, port from `E2E_PORT` env, global setup)
- `e2e/global.setup.ts` — Creates/finds a test user in Clerk via Admin API
- `e2e/helpers/auth.ts` — `signInAsTestUser(page)` helper using `@clerk/testing`
- `e2e/*.spec.ts` — Spec files for Dashboard, Bills, Triage, Audit Log, Household
- Tests require `CLERK_SECRET_KEY` (for global setup) and Chromium system libraries
- API tests target port 8080 (Express server), NOT 22333 (Vite frontend)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
