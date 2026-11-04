# Phase 1 Audit: current provider system

Scope: what exists today, what conflicts with the Vendor Intelligence Engine requirements, and the plan and risks
that were stated **before** any code was changed. Every finding below was checked against the code in the uploaded ZIP.

## 1. Current state

| Area | What exists | Where |
| --- | --- | --- |
| Stack | Next.js 16.2.9 (App Router), React 19, Prisma 6.16.2, PostgreSQL, Tailwind v4, Zod | `package.json` |
| Auth | Demo cookie session. A client-set, **unsigned** `demo_profile_id` cookie selects a seeded user. Helpers `requireAuth/requireAdmin/requireHouseAccess` read the user from the DB. | `src/lib/auth.ts`, `src/proxy.ts` |
| Provider model | `ServiceProvider` (required, unique `userId`), `ServiceCategory` (flat name list), `ServiceProviderCategory`, `ServiceArea` (city + radius), `HouseProvider`, `Review`, `ClaimRequest` | `prisma/schema.prisma` |
| Provider routes | `/api/providers`, `/api/admin/providers`, `/api/admin/claims`, `/api/reviews`, `/api/houses/[id]/providers` | `src/app/api/**` |
| Recommendations | `getRecommendedProviders` in `src/lib/service-discovery.ts`: stage-name to category-name map, same-city filter | `src/lib/service-discovery.ts` |
| Schema management | `prisma db push`. There is **no `prisma/migrations` history**. | `package.json` |
| Tests | None existed. No test runner configured. | n/a |
| Type check | `tsc --noEmit`: 0 errors (with the generated Prisma client) | |
| Lint baseline | 206 problems, 10 errors, 196 warnings. Pre-existing and unrelated to this phase. | |

## 2. Findings that conflict with the requirements

| # | Finding | Evidence | Requirement affected | Phase 1 action |
| --- | --- | --- | --- | --- |
| F1 | **A business cannot exist without a user.** `ServiceProvider.userId` is required and unique. | schema `service_providers` | "Do not extend a model that requires every business to have a user." | New `BusinessListing` model, independent of users. Legacy model untouched. |
| F2 | **The admin "create provider" route fabricates fake users** (`provider-<ts>@hcos.placeholder`) to satisfy F1. | `src/app/api/admin/providers/route.ts` | "Do not create fake placeholder user accounts." | **Not changed** (existing route, compatibility). The backfill never links such accounts. Needs a decision, see section 5. |
| F3 | **Categories are a flat name list**, seeded with 5 names. Stage-to-category links are hard-coded strings that do not match the seeded stages. | `service-discovery.ts` uses `Planning`, `Walls & Masonry`, `Utilities`, `Mason`, `Internet Installer`; seed has `Site Preparation`, `Foundation`, `Structure`, `MEP`, `Finishing`, `Handover` and 5 categories | Taxonomy must be database-driven, hierarchical, with a many-to-many stage relation. | New taxonomy tables and seed. Recommendation code untouched. |
| F4 | **Recommendations silently return nothing** for the seeded stage names (no map entry), and the stage map is used as a *filter*. | `STAGE_SERVICE_MAP[...] ?? []` | "Stage must never hide categories." | Documented. Phase 2 replaces it. The new API only ranks by stage, never filters (tested). |
| F5 | **House has no PIN code and no coordinates**, only `city` and `state`. | schema `houses` | PIN code is the primary geographic reference. | Not added in Phase 1 (not required by the foundation). Phase 2 prerequisite, see section 5. |
| F6 | **`Review.rating` defaults to 5**, and the review form posts no rating, so stored ratings are fabricated 5s. | schema `reviews.rating @default(5)` | "Never assign a default five-star rating." | **Not changed** (alters existing data semantics). Needs a decision, see section 5. |
| F7 | **`GET /api/reviews` has no authentication.** | `src/app/api/reviews/route.ts` GET | Safe API handling. | Not changed. Flagged. |
| F8 | **Claim submission is unreachable for non-admins.** The same `POST` handler calls `requireAdmin` before the "submit a claim (by non-admin user)" branch. | `src/app/api/admin/claims/route.ts` | Owner claim flow (later phase). | Not changed. Flagged for the claims phase. |
| F9 | **Auth is demo-grade.** The cookie is unsigned and settable from the browser, so anyone can act as the admin. Fine for the demo, not production-ready. | `src/app/page.tsx`, `src/lib/auth.ts` | "Do not assume existing auth is production-ready." | New admin endpoints use the existing `requireAdmin`, so they inherit whatever the auth layer becomes. Documented. |
| F10 | `Review` and `HouseProvider` point at `ServiceProvider`. | schema | Compatibility. | Preserved. Listings carry `legacyServiceProviderId` so a later phase can resolve reviews and house links to listings. |

## 3. What Phase 1 deliberately does not do

No discovery, no external API calls, no scraping, no ranking, no review changes, no claim flow, no UI redesign, no image
handling. No existing table, column, route or component was altered. The Service Providers page keeps working exactly as before.

## 4. Plan and risks (stated before implementation)

**Plan:** (1) additive schema; (2) reviewed, tested SQL migration plus rollback; (3) taxonomy and data-source seeds that are idempotent
and never overwrite admin edits; (4) idempotent backfill of legacy providers into listings; (5) read API for categories and
admin-protected management API with audit logging, validation, pagination and rate limiting; (6) tests that run the real SQL.

| Risk | Mitigation |
| --- | --- |
| Migration breaks existing data | Additive only. Test proves legacy tables are byte-for-byte unchanged. Tested rollback. |
| No migration history exists | SQL kept in `prisma/sql/`, not `prisma/migrations/`, so it cannot corrupt Prisma's migration state. See `MIGRATION_PLAN.md`. |
| Hand-written SQL drifts from the Prisma schema | SQL generated from Prisma's own datamodel, then a drift test checks columns, types, nullability, enums, indexes, FKs and delete rules. |
| Seed overwrites admin edits | Insert-only seeds, tested. |
| Fake or demo data shown as real | Fixtures flagged `isFixture`, with their own provenance source. Placeholder accounts never linked. No location is invented. |
| Backfill is not repeatable | All statements guard with `NOT EXISTS`/`ON CONFLICT`. Tested twice-run, partial-run and rollback. |
| Source terms are unknown | Every external source defaults to most restrictive and `NEEDS_HUMAN_REVIEW`. Nothing asserts a permission. |
