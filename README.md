# Construction Dekho (HCOS): House Construction Operating System

A platform that guides homeowners in India through every stage of building a house: planning, task tracking, budgeting, documents, service providers, alerts and progress verification, all in one place.

This build is configured as a **frictionless client demo**. There is no sign-in, no sign-up and no third-party auth service. Open the app, pick a profile, and start exploring pre-seeded data.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Demo Profiles & How Auth Works](#demo-profiles--how-auth-works)
6. [Seed Data](#seed-data)
7. [Project Structure](#project-structure)
8. [Roles & Permissions](#roles--permissions)
9. [API Overview](#api-overview)
10. [Design System & Theming](#design-system--theming)
11. [npm Scripts](#npm-scripts)
12. [Troubleshooting](#troubleshooting)
13. [Deployment Notes](#deployment-notes)
14. [Development Guidelines](#development-guidelines)

---

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Portfolio overview: active projects, open alerts, pending decisions, total spend, recent progress updates |
| **Houses** | Create and manage projects (plot size, floors, bedrooms, house type, city) |
| **Roadmap** | Stage-by-stage construction roadmap: Site Preparation, Foundation, Structure, MEP, Finishing, Handover |
| **Tasks** | Per-house task lists with status (pending, in progress, completed, skipped, blocked) and dependency awareness |
| **Decisions** | Required decisions per stage (brands, materials, finishes) that block or unblock progress |
| **Alerts** | Dependency, budget, weather and progress warnings, with acknowledge flow |
| **Budget** | Expense tracking by category with city-based cost estimates for comparison |
| **Documents** | Document vault for drawings, plans, invoices and warranties |
| **Progress** | Photo/video updates submitted by the team and verified by owners |
| **Team** | House members with roles: owner, family member, contractor, architect |
| **Service Providers** | Directory of verified electricians, plumbers, painters and more, with reviews and "would hire again" ratings |
| **Admin Console** | Platform-wide users, houses, providers and provider-claim requests |
| **Notifications** | In-app notification centre |
| **Light / Dark mode** | One-click theme switch that persists between visits |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack disabled in dev via `--webpack`), React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with a custom brand theme
- **Database:** PostgreSQL via Prisma ORM 6 (works well with Neon, Supabase, or local Postgres)
- **Validation:** Zod
- **Icons / UI:** lucide-react, Radix UI primitives, Sonner toasts
- **Storage (optional):** Cloudflare R2 (S3-compatible) for uploads
- **Auth:** none. Cookie-based demo sessions (see below)

> Note: this version of Next.js has breaking changes versus older releases. For example, `middleware.ts` is now `proxy.ts`. Check `node_modules/next/dist/docs/` before relying on older conventions.

---

## Quick Start

### Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (a free Neon or Supabase instance is fine)

### 1. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 2. Configure environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env` (see [Environment Variables](#environment-variables)).

### 3. Create tables and load demo data

```bash
npm run db:setup
```

This runs `prisma db push` followed by the seed script. You can run the seed any time to reset the demo projects.

### 4. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>, pick a profile, and you are in.

---

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/dbname` |
| `R2_ACCOUNT_ID` | Uploads only | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | Uploads only | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Uploads only | R2 secret |
| `R2_BUCKET_NAME` | Uploads only | R2 bucket name |
| `R2_PUBLIC_URL` | Uploads only | Public base URL used to serve uploaded files |

> **Important:** Next.js loads both `.env` and `.env.local`, with `.env.local` taking priority, but the Prisma CLI (`db push`, seed) only reads `.env`. If you use both files, make sure `DATABASE_URL` is identical in each. Otherwise the app will read a different, unseeded database than the one you seeded.

There are no Clerk keys, webhook secrets or other auth variables.

---

## Demo Profiles & How Auth Works

### Profiles

| Profile | Role | What you will see |
| --- | --- | --- |
| **Aryaman** | Project Admin | Everything: all houses, users, providers, claims, plus the Admin Console |
| **Sharma Family** | Homeowner | *Sharma Villa* (Bangalore), a fully completed build |
| **Nair Family** | Homeowner | *Nair Duplex* (Mumbai), mid-construction with active alerts and pending decisions |

Use **Switch Profile** in the sidebar to jump between them at any time.

### Session flow

1. The root page (`/`) is a profile picker. Choosing a profile sets a `demo_profile_id` cookie (valid for 24 hours) and redirects to `/dashboard`.
2. `src/proxy.ts` runs before every protected route. It checks that the cookie holds a **known** profile id. Missing or invalid cookies are redirected to `/` (and cleared), so there are no redirect loops.
3. `src/lib/auth.ts` exposes the server-side helpers:
   - `getCurrentUser()`: lightweight session from the cookie (no database call)
   - `requireAuth()`: loads the matching database user, or returns a 401/404 response
   - `requireAdmin()`: same, but requires the `ADMIN` role
   - `requireHouseAccess(houseId, permission)`: checks ownership/membership and the requested permission
4. If a page cannot find the demo user in the database (for example, the seed was not run), it redirects to `/?reset=1`. The picker then clears the cookie and shows a warning with the fix.

Profile ids are shared in `src/lib/demo-profiles.ts` and must match the ids created in `prisma/seed.ts`.

---

## Seed Data

`prisma/seed.ts` is idempotent and safe to re-run. It creates:

- **Catalog:** house types, six construction stages with tasks and decisions, sample features, service categories
- **Users:** the three demo profiles and three service-provider accounts
- **Providers:** BrightSpark Electricals, AquaFlow Plumbing, ColorCraft Painters, each with categories and service areas
- **Houses:** Sharma Villa (all stages complete) and Nair Duplex (first three stages complete, fourth in progress). These are deleted and rebuilt on every seed run.
- **Per house:** stages, tasks, decisions, expenses, documents, a progress update, and an assigned provider
- **Extras:** alerts for the in-progress house, a provider review, and notifications

To reset everything to a clean demo state:

```bash
npm run db:seed
```

---

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma          # Data model
│   └── seed.ts                # Demo data
├── src/
│   ├── proxy.ts               # Route gatekeeper (cookie check)
│   ├── app/
│   │   ├── layout.tsx         # Root layout, theme init script, toaster
│   │   ├── page.tsx           # Profile picker
│   │   ├── globals.css        # Brand theme + light/dark tokens
│   │   ├── (dashboard)/       # Authenticated area (sidebar layout)
│   │   │   ├── dashboard/
│   │   │   ├── houses/        # list, new, [houseId]/{roadmap,tasks,budget,documents,progress,alerts,members,settings}
│   │   │   ├── providers/
│   │   │   ├── notifications/
│   │   │   └── admin/         # users, houses, providers, claims
│   │   └── api/               # Route handlers (see API Overview)
│   ├── components/
│   │   ├── layout/            # Sidebar, dashboard shell, theme toggle, profile switcher
│   │   ├── ui/                # Button, Card, Badge, Input, Modal, ProgressBar, ...
│   │   └── <feature>/         # Feature views: dashboard, house, budget, roadmap, ...
│   └── lib/
│       ├── auth.ts            # Cookie session + permission helpers
│       ├── demo-profiles.ts   # Shared demo profile definitions
│       ├── prisma.ts          # Prisma client singleton
│       ├── roadmap-engine.ts  # Stage/task/decision progress logic
│       ├── alert-engine.ts    # Alert generation
│       ├── service-discovery.ts # Provider matching by city/category
│       ├── notifications.ts   # Notification helpers
│       ├── audit.ts           # Audit log writer
│       ├── storage.ts         # R2 upload helpers
│       └── types.ts           # Shared types and permission names
```

---

## Roles & Permissions

**Platform roles** (`User.role`): `OWNER`, `FAMILY_MEMBER`, `CONTRACTOR`, `SERVICE_PROVIDER`, `ARCHITECT`, `ADMIN`.

`ADMIN` can access every house and every admin route.

**House roles** (`HouseMember.role`) determine what a person can do inside a specific house:

| Permission | Owner | Family member | Contractor | Architect |
| --- | :-: | :-: | :-: | :-: |
| View house, budget, documents | ✅ | ✅ | ✅ | ✅ |
| Edit house details | ✅ | | | |
| Delete house | ✅ | | | |
| Manage members | ✅ | | | |
| Update tasks | ✅ | ✅ | ✅ | |
| Complete stages | ✅ | | | |
| Edit budget | ✅ | | | |
| Make decisions | ✅ | ✅ | | ✅ |
| Submit progress updates | ✅ | ✅ | ✅ | ✅ |
| Verify progress | ✅ | | | |
| Upload documents | ✅ | ✅ | ✅ | ✅ |

The house owner (`House.ownerId`) always has owner permissions.

---

## API Overview

All endpoints live under `/api` and return JSON. Auth failures return `401`, permission failures `403`, missing records `404`.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/user` | GET | Current demo user |
| `/api/houses` | GET, POST | List / create houses |
| `/api/houses/[houseId]` | GET, PATCH, DELETE | House details |
| `/api/houses/[houseId]/stages` | GET, POST | Stage status |
| `/api/houses/[houseId]/tasks` | GET, POST/PATCH | Tasks |
| `/api/houses/[houseId]/decisions` | GET, POST/PATCH | Stage decisions |
| `/api/houses/[houseId]/budget` | GET, POST, DELETE | Expenses and estimates |
| `/api/houses/[houseId]/documents` | GET, POST, DELETE | Document vault |
| `/api/houses/[houseId]/progress` | GET, POST, PATCH | Progress updates and verification |
| `/api/houses/[houseId]/alerts` | GET, PATCH | Alerts |
| `/api/houses/[houseId]/members` | GET, POST, DELETE | Team |
| `/api/houses/[houseId]/features` | GET, POST | Enabled features |
| `/api/houses/[houseId]/providers` | GET, POST | Providers assigned to a house |
| `/api/providers` | GET, POST | Provider directory / registration |
| `/api/reviews` | GET, POST | Provider reviews |
| `/api/notifications` | GET, PATCH | Notifications |
| `/api/features`, `/api/house-types` | GET | Catalog data |
| `/api/upload` | POST | File upload (needs R2 configured) |
| `/api/admin/users`, `/providers`, `/claims` | GET, POST/PATCH | Admin management |

---

## Design System & Theming

The UI uses one consistent brand palette across the whole product:

| Token | Value | Use |
| --- | --- | --- |
| Base ink | `#030407` | Dark-mode background, primary dark surface |
| Brand blue | `#1558C9` | Primary brand colour: nav, icons, progress, secondary buttons |
| Highlight lime | `#D4FF24` | Primary buttons, active indicators, focus rings, selected states |

**How it is wired**

- Colour scales are defined in `src/app/globals.css` under `@theme` (`brand-*`, `accent`, and remapped `zinc-*`/`blue-*`), so components inherit the brand automatically.
- Light is the base; dark styles apply under the `.dark` class on `<html>` through `@custom-variant dark`.
- `src/components/layout/theme-toggle.tsx` provides:
  - `ThemeSwitch`: Light | Dark segmented control in the sidebar footer
  - `ThemeIconButton`: compact toggle shown on mobile
  - `ThemedToaster`: toast notifications that follow the theme
  - `themeInitScript`: runs before first paint to avoid a flash of the wrong theme
- The choice is stored in `localStorage` under `hcos-theme`. The default for first-time visitors is dark.
- In light mode, lime is not used for text or icons (poor contrast on white). Blue takes over those roles, while lime remains on primary buttons.

**Writing new UI:** always provide both modes, e.g. `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100`. Use `text-brand-600 dark:text-accent` for highlighted icons and text.

---

## npm Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server (webpack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Sync the schema to the database |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:seed` | Load or reset demo data |
| `npm run db:setup` | `db:push` + `db:seed` in one step |
| `npm run db:studio` | Open Prisma Studio |

---

## Troubleshooting

**`/dashboard` keeps redirecting, or you land back on the picker with a warning**
The demo users are not in the database the app is reading. Run `npm run db:setup`, and confirm `DATABASE_URL` is the same in `.env` and `.env.local`.

**Type errors like "implicitly has an 'any' type" or missing `Prisma.InputJsonValue`**
The Prisma client has not been generated. Run `npx prisma generate`.

**Fonts fail to load in restricted networks**
The app fetches Inter from Google Fonts at build/dev time and falls back to the system font if it cannot. This is cosmetic only.

**Uploads fail**
Set all five `R2_*` variables. Uploads are the only feature that needs them.

**Schema prompts about dropping a column on `db push`**
Older databases may contain a `clerkId` column on `users` from a previous version. It is safe to accept for the demo.

**Want a clean slate**
Run `npm run db:seed` to rebuild the demo houses, or clear the `demo_profile_id` cookie (or use Switch Profile) to reset your session.

---

## Deployment Notes

- Set `DATABASE_URL` (and the `R2_*` variables if you want uploads) in your hosting provider.
- Run `npm run db:setup` once against the production database to create tables and demo data.
- Build with `npm run build` and serve with `npm run start` (or deploy on Vercel).
- **This build intentionally has no real authentication.** Anyone who can reach the URL can act as any profile, including the admin. Use it only for demos and never with real customer data. To go to production, replace `src/lib/auth.ts` and `src/proxy.ts` with a real auth provider while keeping the same helper signatures (`requireAuth`, `requireAdmin`, `requireHouseAccess`), so the API routes keep working unchanged.

---

## Development Guidelines

- Keep the demo frictionless: do not add sign-in screens, tokens or provider-synced hooks.
- Stay consistent with the Next.js App Router, TypeScript, Prisma and Tailwind patterns already in the codebase.
- New server pages should read the session through `getCurrentUser()` and API routes through `requireAuth()`, `requireAdmin()` or `requireHouseAccess()`.
- New demo users must be added to **both** `src/lib/demo-profiles.ts` and `prisma/seed.ts` with matching ids.
- Style every new component for both light and dark mode.
