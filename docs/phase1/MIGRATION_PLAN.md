# Phase 1 migration plan

## What changes in the database
14 new tables and 10 new enums, all prefixed `business_` / `Business*`. 22 foreign keys. 34 indexes. 13 CHECK constraints.
**No existing table, column, index or constraint is altered.** Nothing is dropped or renamed. Verified by test.

## Two supported paths (pick one per environment, do not mix)

### A. Demo / `prisma db push` (this repo's current workflow)
```bash
npm install
npx prisma generate
npx prisma db push            # additive: creates the new tables and enums, no data-loss prompt expected
npm run db:seed-directory     # CHECK constraints + data sources + taxonomy + backfill (idempotent)
```
`npm run db:setup` does push + full seed in one step for a fresh database.

### B. SQL migration (production-like databases)
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/sql/001_business_directory_foundation.sql
npm run db:seed-directory
```
The file creates tables and then adds the CHECK constraints. Wrap it in a transaction if your tooling does not.

> The SQL lives in `prisma/sql/`, not `prisma/migrations/`, on purpose. This repo has no migration history, so adding a
> lone file to `prisma/migrations/` would make `prisma migrate dev` report drift. To adopt Prisma Migrate later, baseline first:
> `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql`, then
> `prisma migrate resolve --applied <baseline>`.

## Order of operations on an existing database
1. Back up (or use a Neon branch).
2. Path A or B above.
3. `npm run db:seed-directory`. It runs in this order: CHECK constraints, data sources, taxonomy, then backfill. Each stage is idempotent.
4. Verify (queries below).

## Verification queries
```sql
SELECT count(*) FROM service_providers;                                   -- unchanged
SELECT count(*) FROM business_listings WHERE "legacyServiceProviderId" IS NOT NULL;  -- equals the line above
SELECT count(*) FROM business_categories WHERE "parentId" IS NULL;        -- 18 groups
SELECT count(*) FROM business_listings WHERE "isFixture";                 -- demo providers only
SELECT count(*) FROM business_user_links l JOIN users u ON u.id = l."userId" WHERE u.email LIKE '%@hcos.placeholder'; -- 0
```

## Rollback
`prisma/sql/001_business_directory_foundation.rollback.sql` drops only the objects created above. **It permanently deletes all directory data.**
Back up first if anything was created after the migration. Tested: legacy data and structure are identical afterwards, and the forward migration re-applies cleanly.

## Backfill rules
| Legacy | New | Notes |
| --- | --- | --- |
| `ServiceProvider` | `BusinessListing` | `PUBLISHED` if `active`, else `SUPPRESSED`. `VERIFIED` if `verified`. `legacyServiceProviderId` keeps the link. Slug = name + id fragment. |
| `ServiceCategory` | `BusinessLegacyCategoryMap` | Mapped by name (`legacy-category-map.ts`). Unknown names are imported under *Specialist Services* as `legacy-<name>`. |
| `ServiceProviderCategory` | `BusinessListingCategory` | One primary per listing, chosen deterministically. |
| `ServiceArea` (city, radius) | `BusinessServiceArea` (`CITY`, `radiusKm`) | **No physical location is created**; legacy data has none. |
| `ServiceProvider.userId` | `BusinessUserLink` (`LEGACY_ACCOUNT`) | **Skipped** for `@hcos.placeholder` accounts. |
| Provider ids starting `demo-` | `isFixture = true`, provenance source `fixture` | Convention from `prisma/seed.ts`. |

Not propagated yet: edits made to a legacy provider **after** the backfill (verification, active flag, name). Re-running the backfill adds new providers only.
