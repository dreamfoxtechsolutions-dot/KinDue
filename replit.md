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

## Important Notes

- Clerk frontend: use `@clerk/react` (NOT `@clerk/clerk-react`) for imports
- Vite `fs.strict` set to `false` to allow pnpm symlinked packages
- API routes all require Bearer token from Clerk via `requireAuth` middleware
- `requireAuth` auto-creates DB users on first login via Clerk user API
- `logAudit()` utility used throughout routes for full audit trail

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
