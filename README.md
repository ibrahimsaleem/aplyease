# AplyEase Portal

A full-stack job application tracking portal with role-based access control (ADMIN, EMPLOYEE, CLIENT). Built with React + Vite on the client, Express + Drizzle ORM (Neon Postgres) on the server, and a shared typed schema.

## Tech Stack
- Client: React 18, Vite, Tailwind, shadcn/ui components, wouter, TanStack Query
- Server: Express, Drizzle ORM, Neon Serverless Postgres, express-session, bcrypt
- Shared: Drizzle schema + Zod validation in `shared/`

## Project Structure
- `client/`: SPA client app
  - `index.html`: app shell (includes embedded SVG favicon)
  - `src/main.tsx`: bootstraps React
  - `src/App.tsx`: routes and auth gate
  - `src/pages/*`: `login`, `admin-dashboard`, `employee-dashboard`, `client-dashboard`, `not-found`
  - `src/components/*`: UI components (tables, forms, headers, stats)
  - `src/hooks/use-auth.ts`: auth hooks (login/logout, current user)
  - `src/lib/queryClient.ts`: fetch wrapper and React Query client
  - `src/types/`: shared client types
- `server/`: API server
  - `index.ts`: Express app, CORS, error handling, static serving/dev Vite
  - `routes.ts`: auth, users, applications CRUD, stats, CSV export
  - `auth.ts`: session and password helpers, RBAC guards
  - `storage.ts`: database access (Drizzle)
  - `db.ts`: Neon serverless pool + drizzle instance
  - `vite.ts`: dev middleware and production static serving
  - `tsconfig.json`: compiles to `dist/server`
- `shared/`: Drizzle schema and Zod schemas
- `scripts/seed.ts`: seeds demo users and sample data
- `vite.config.ts`: client build and dev proxy
- `package.json`: scripts for dev/build/start

## Prerequisites
- Node.js 18.x (engines enforce >=18 <20)
- Postgres database (Neon recommended)

## Environment Variables
- `DATABASE_URL` (required): Postgres connection string
- `SESSION_SECRET` (recommended in dev; required in prod): cookie session secret
- `NODE_ENV`: `development` or `production`

## Local Development
1) Install dependencies:
```powershell
npm install
```
2) Apply schema to your database:
```powershell
$env:DATABASE_URL='<YOUR_POSTGRES_URL>'; npm run db:push
```
3) Seed demo data (idempotency not guaranteed; run once):
```powershell
$env:DATABASE_URL='<YOUR_POSTGRES_URL>'; npx tsx scripts/seed.ts
```
4) Start dev servers (Express + Vite):
```powershell
$env:NODE_ENV='development'; $env:DATABASE_URL='<YOUR_POSTGRES_URL>'; $env:SESSION_SECRET='dev-secret'; npm run dev
```
- Client: `http://localhost:5173`
- API (proxied): `http://localhost:5000`

Login with demo users:
- Admin: `admin@aplyease.com` / `admin123`
- Employee: `employee@aplyease.com` / `emp123`
- Client: `arshad@client.com` / `client123`

## Production Build & Run
1) Build:
```bash
npm run build
```
- Vite emits client to `dist/`
- `tsc -p server/tsconfig.json` emits server to `dist/server/`

2) Start:
```bash
NODE_ENV=production DATABASE_URL=<URL> SESSION_SECRET=<secret> node dist/server/index.js
```

## Notable Implementation Details
- CORS allows `localhost:5173` and Vercel domains in dev, with `credentials:true`.
- Sessions: cookie-based via `express-session` (in-memory store in dev).
- RBAC: route guards via `requireAuth` and `requireRole`.
- CSV export: `/api/applications/export` returns a CSV of filtered applications.
- Dev UX: embedded SVG favicon; Vite middleware HMR in dev; static serving in prod.

## Maintenance
- Type check:
```bash
npm run check
```
- Linting: (not configured; can be added with ESLint/Prettier)

## Changelog (this cleanup)
- Fixed `getJobApplication` aliasing in `server/storage.ts`
- Removed unused `api/` serverless folder to avoid confusion
- Embedded favicon in `client/index.html`
- Added this README

## Troubleshooting
 - 401 on `/api/auth/user` pre-login is expected.
 - 500 on `/api/auth/login`: verify `DATABASE_URL` is valid and reachable.
 - Seed duplicate errors: indicates data already inserted; safe to ignore.
