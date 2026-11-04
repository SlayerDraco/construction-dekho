# Phase 1 handoff: business directory foundation

## 1. Summary
Phase 1 adds the data foundation for a business-centred directory: listings that exist without any user account, a database-driven
hierarchical taxonomy (18 groups, 126 subcategories), provenance and source-policy tracking, an audit trail, and an idempotent backfill
of the existing providers. It is additive: the existing Service Providers feature is untouched and keeps working.

**Evidence:** `tsc --noEmit` 0 errors. `npm test`: 83 tests in 6 files, all passing. The migration, rollback, seed and backfill SQL were executed
against a real PostgreSQL engine (PGlite, PostgreSQL 17 compiled to WASM). The API routes compile and return 401 without a session.

## 2. Verified vs not verified
| Verified (executed) | Not verified (typechecked / reviewed only) |
| --- | --- |
| Migration SQL applied to a legacy-shaped database; legacy tables unchanged; rollback and re-apply | Prisma-backed category service and API handlers were **not run against a database** (the sandbox cannot download Prisma's query engine). Covered by type checking, compile, the auth guard check, and unit tests of the pure logic they call. |
| SQL matches `schema.prisma` (columns, types, nullability, enums, indexes, FKs, delete rules, 63-char limit) | Behaviour on Neon specifically. Run the first backfill on a branch or copy. |
| Seed idempotency, admin edits preserved, stage mapping, backfill (all rules), twice-run, partial-run, rollback | `prisma migrate diff` against Prisma's own SQL (needs Prisma's schema engine, which was unavailable here). Suggested check below. |
| Validation schemas, hierarchy/cycle/depth guards, search ranking, stage-never-hides | Admin category management through HTTP (create/patch/delete, audit rows, cascade deactivation). Please exercise once with the admin profile. |

Suggested confirmation on your machine: on an empty scratch database run `npx prisma db push`, then compare its tables to
`prisma/sql/001_business_directory_foundation.sql`, or `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`.

## 3. Design

### 3.1 Principle: a business is not a user
`BusinessListing` has no required relation to `User`. Association is optional via `BusinessUserLink` (`LEGACY_ACCOUNT`, `OWNER_CLAIM`, `REPRESENTATIVE`).
Status axes are independent so that none implies another:

| Axis | Values |
| --- | --- |
| `listingStatus` | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `SUPPRESSED`, `REMOVED` |
| `verificationStatus` | `UNVERIFIED`, `VERIFIED`, `REVOKED` |
| `promotionStatus` | `NONE`, `FEATURED` |

### 3.2 Tables (14)
`business_listings`, `business_user_links`, `business_categories`, `business_category_stages`, `business_category_external_mappings`,
`business_legacy_category_maps`, `business_listing_categories`, `business_locations`, `business_service_areas`, `business_data_sources`,
`business_source_records`, `business_field_provenance`, `business_images`, `business_audit_logs`.

Key decisions:
- **Location vs service area are separate.** `BusinessLocation` is where it is (address, PIN, lat/lng). `BusinessServiceArea` is where it serves (many per business; `PINCODE`, `LOCALITY`, `CITY`, `DISTRICT`, `STATE`, `RADIUS`, `NATIONWIDE`).
- **Geospatial:** plain `latitude`/`longitude` with a composite index plus PIN and state/city indexes. No PostGIS extension is required (portable across Neon, Supabase, local). Phase 2 can use a bounding-box prefilter plus haversine. If volume demands it, PostGIS can be added later as a separate migration.
- **Categories:** self-referencing tree (max 3 levels, enforced), `synonyms[]`, `discoveryTerms[]`, optional `defaultRadiusKm` (null means the app default of 50 km, `DEFAULT_DISCOVERY_RADIUS_KM`).
- **Stages:** many-to-many with `relevance` 1 to 3. Used for ranking only.
- **External mappings** (Google Places type, OSM tag) are stored as proposals per category and are **unverified**.
- **Source separation:** `BusinessSourceRecord` is a record *in a source*, nullable `businessId`, `rawPayload` null by default. Profile fields never share a table with raw source content. `BusinessFieldProvenance` records, per business and field and source: origin, licence basis, display policy (defaults to `INTERNAL_ONLY`), obtained/checked/retain-until/refresh-by dates.
- **Data source registry** (`BusinessDataSource`): licence basis, attribution, permitted fields, retention, display and image permission, refresh and deletion obligations, rate limit notes, and a policy review status. Seeded entries for `legacy_provider`, `fixture`, `admin_manual`, `vendor_supplied`, `google_places`, `openstreetmap`. External sources start inactive, not displayable, no images, `NEEDS_HUMAN_REVIEW`. Re-seeding never overwrites a reviewed policy.
- **Images:** DB constraint: an image can only be `APPROVED` with licence or permission evidence, and must have a URL or storage key. Absent an approved image the UI should use a category placeholder (UI is Phase 2+).
- **Audit:** `BusinessAuditLog` (before/after JSON, actor, reason). Category create/update/deactivate/reactivate/delete/stage/mapping changes are written inside the same transaction as the change. Action names for publish, reject, merge, verification and promotion are declared for later phases.
- **DB guards:** 13 CHECK constraints (slug format, coordinate range and pairing, PIN format, service-area required fields, positive radii, relevance range, image evidence, no self-parent).

### 3.3 Taxonomy (126 subcategories in 18 groups)
Planning, Architecture & Engineering (10) · Land & Site Preparation (5) · Foundation & Structural Work (9) · General Construction & Contracting (5) ·
Roofing & Building Envelope (6) · Doors, Windows & Glass (6) · Electrical & Power (6) · Plumbing & Sanitation (6) · Flooring & Surface Finishes (7) ·
Plastering & Painting (7) · Interior Design & Furnishing (7) · HVAC & Mechanical Systems (5) · Smart Home & Security (7) ·
External Development & Landscaping (7) · Building Materials & Retail (12) · Energy, Water & Sustainability (7) · Cleaning, Maintenance & Repairs (6) · Specialist Services (8).

125 of 126 have stage relevance; 10 carry a proposed Google Places type and 32 a proposed OSM tag. The seed resolves stage names against whichever naming scheme exists
(the repo has two), so it works with the 6 seeded stages and the 16-stage set implied by `service-discovery.ts`.
The data lives in `src/lib/directory/taxonomy-data.ts`; the database is the runtime source of truth.

**Seed behaviour:** creates missing categories only; never overwrites an existing row, so admin edits survive. Stage and external mappings are insert-missing: a seeded mapping an admin deletes will reappear on the next seed, so deactivate a category rather than deleting its seeded mappings.

### 3.4 Compatibility strategy
| Legacy | Stays | Bridge |
| --- | --- | --- |
| `ServiceProvider`, `ServiceCategory`, `ServiceArea`, `HouseProvider`, `Review`, `ClaimRequest` | Unchanged and authoritative for all current routes | `BusinessListing.legacyServiceProviderId`, `BusinessLegacyCategoryMap` |
| Providers page, search, recommendations, admin provider UI | Unchanged | Phase 2 migrates reads to listings |

## 4. API
All under `/api`, JSON. Errors: 400 validation (with details), 401, 403, 404, 409 conflict, 429 rate limit (with `Retry-After`), 500 generic (internals never leaked).

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/business-categories` | any signed-in user | `view=tree` (default) or `flat`; `q` (name/synonym/discovery-term search), `parentId`, `stageId` (ranking only), `includeStages`, `page`, `limit` (max 200). Inactive categories only for admins with `includeInactive=true`. 120 req/min per user. |
| `GET /api/business-categories/[idOrSlug]` | signed-in | One category with stages and mappings. Inactive hidden from non-admins. |
| `POST /api/admin/business-categories` | admin | Create (slug auto-generated if omitted, parent/cycle/depth validated, stages must exist). |
| `PATCH /api/admin/business-categories/[id]` | admin | Partial update; sends only what changes (regression-tested). Deactivating cascades to descendants. `stages` and `externalMappings` replace atomically. |
| `DELETE /api/admin/business-categories/[id]` | admin | Only unused categories (no children, listings or legacy maps); otherwise 409 with advice to deactivate. |

Admin writes: 30 req/min per admin. **Limitation:** the rate limiter is in-memory, per server instance. Replace its store with a shared one (e.g. Redis) before multi-instance deployment.

## 5. Decisions needed from you
| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | `POST /api/admin/providers` still creates fake `@hcos.placeholder` users (finding F2). | Phase 2: admin "add provider" creates a `BusinessListing`; keep the legacy route only until the UI moves. |
| D2 | `Review.rating @default(5)` stores fabricated 5-star ratings (F6). | Phase 3: make it nullable and drop the default; decide whether existing default-5 rows become null. Not changed now to avoid altering existing data. |
| D3 | `House` lacks PIN code and coordinates (F5). | Add nullable `House.pincode` first thing in Phase 2. Coordinates need a PIN to coordinates dataset with a licence you are comfortable with. |
| D4 | Backfilled active providers become `PUBLISHED` (parity with today's visibility). | Alternative: land them as `PENDING_REVIEW`. Say so if you prefer that. |
| D5 | Edits to a legacy provider after the backfill are not propagated. | Either keep the legacy UI frozen until Phase 2, or approve a dual-write. |
| D6 | Schema workflow: stay on `db push` or adopt Prisma Migrate (needs a baseline). | See `MIGRATION_PLAN.md`. |
| D7 | Admin UI for taxonomy (only the API exists). | Small admin screen in Phase 2. |
| D8 | Legal review of Google Places and OpenStreetMap terms before any adapter is enabled. | Human review. Nothing in this phase asserts a permission. |
| D9 | `GET /api/reviews` is unauthenticated (F7); claim submission is admin-only (F8); demo cookie is unsigned (F9). | Fix in the phases that touch reviews, claims and production auth. |

## 6. Phase 2 entry criteria
- Run `npm test`, then `npm run db:setup` (fresh) or the existing-database steps in `MIGRATION_PLAN.md`, and confirm the verification queries.
- Exercise the admin category API once with the Aryaman profile.
- Resolve D3 and D4. Decide D1.

## 7. Files
**New:** `prisma/sql/001_business_directory_foundation.sql`, `…rollback.sql`, `prisma/seed-directory.ts`, `src/lib/directory/*` (taxonomy data and seed, sources, backfill, constraints, tree/search, validation, service, audit, errors, SQL executor), `src/lib/rate-limit.ts`, `src/app/api/business-categories/**`, `src/app/api/admin/business-categories/**`, `tests/directory/**`, `vitest.config.ts`, `docs/phase1/*`.
**Modified:** `prisma/schema.prisma` (additive models plus back-relations), `prisma/seed.ts` (calls the directory foundation at the end), `package.json` (scripts `test`, `test:watch`, `db:seed-directory`; dev dependencies `vitest@3`, `@electric-sql/pglite`), `package-lock.json`.

vitest is pinned to major 3 because vitest 5 requires `@types/node` 22+, while this project uses 20.

## 8. Commands
```bash
npm install
npx prisma generate
npm test                      # 83 tests, ~75 s (spins up an in-process Postgres per test group)
npm run db:setup              # fresh DB: push + full seed (includes directory foundation)
npm run db:seed-directory     # existing DB: constraints + sources + taxonomy + backfill (idempotent)
```
