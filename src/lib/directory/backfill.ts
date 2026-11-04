import { LEGACY_CATEGORY_NAME_TO_SLUG, LEGACY_FALLBACK_PARENT_SLUG } from './legacy-category-map'
import { slugify } from './slug'
import { SQL_NOW, type SqlExecutor } from './sql-executor'

export interface BackfillReport {
  legacyCategoriesMapped: number
  legacyCategoriesImported: number
  listingsCreated: number
  categoryLinksCreated: number
  serviceAreasCreated: number
  userLinksCreated: number
  placeholderAccountsNotLinked: number
  provenanceRowsCreated: number
  auditRowsCreated: number
  fixtureListings: number
}

/** Provider ids with this prefix are demo fixtures (see prisma/seed.ts). */
export const FIXTURE_ID_PREFIX = 'demo-'
/** Email domain used by the legacy admin "create provider" route for fake accounts. Never linked. */
export const PLACEHOLDER_EMAIL_SUFFIX = '@hcos.placeholder'

/**
 * Copies legacy ServiceProvider data into the business directory model. Additive and idempotent:
 * every statement skips rows that already exist, nothing in the legacy tables is modified, and a
 * second run creates nothing. Run it inside one transaction (see run.ts).
 *
 * Preconditions: data sources and taxonomy are seeded.
 */
export async function backfillBusinessDirectory(exec: SqlExecutor): Promise<BackfillReport> {
  const sources = await exec.all<{ key: string }>(
    `SELECT "key" FROM "business_data_sources" WHERE "key" IN ('legacy_provider','fixture')`
  )
  if (sources.length < 2) throw new Error('Data sources are not seeded. Run seedDataSources() first.')

  // --- 1. Map legacy categories to the new taxonomy -------------------------------------------
  const legacy = await exec.all<{ id: string; name: string }>(
    `SELECT sc."id", sc."name" FROM "service_categories" sc
     WHERE NOT EXISTS (SELECT 1 FROM "business_legacy_category_maps" m WHERE m."serviceCategoryId" = sc."id")`
  )
  let mapped = 0
  let imported = 0
  for (const sc of legacy) {
    let slug = LEGACY_CATEGORY_NAME_TO_SLUG[sc.name.trim().toLowerCase()]
    if (slug) {
      const found = await exec.all(`SELECT 1 FROM "business_categories" WHERE "slug" = $1`, [slug])
      if (found.length === 0) throw new Error(`Taxonomy is not seeded: missing category "${slug}".`)
      mapped++
    } else {
      slug = `legacy-${slugify(sc.name, 60) || sc.id.slice(0, 8)}`
      const lower = sc.name.trim().toLowerCase()
      const created = await exec.all(
        `INSERT INTO "business_categories"
           ("id","slug","name","description","parentId","isActive","displayOrder","synonyms","discoveryTerms","createdAt","updatedAt")
         SELECT gen_random_uuid()::text, $1, $2, $3, p."id", true, 1000, ARRAY[$4]::text[], ARRAY[$4]::text[], ${SQL_NOW}, ${SQL_NOW}
         FROM "business_categories" p WHERE p."slug" = $5
         ON CONFLICT ("slug") DO NOTHING RETURNING "id"`,
        [slug, sc.name.trim(), `Imported from legacy category "${sc.name.trim()}". Review its placement.`, lower, LEGACY_FALLBACK_PARENT_SLUG]
      )
      const exists = await exec.all(`SELECT 1 FROM "business_categories" WHERE "slug" = $1`, [slug])
      if (exists.length === 0) throw new Error(`Taxonomy is not seeded: missing "${LEGACY_FALLBACK_PARENT_SLUG}".`)
      if (created.length) imported++
    }
    await exec.run(
      `INSERT INTO "business_legacy_category_maps" ("id","serviceCategoryId","categoryId","createdAt")
       SELECT gen_random_uuid()::text, $1, c."id", ${SQL_NOW} FROM "business_categories" c WHERE c."slug" = $2
       ON CONFLICT ("serviceCategoryId") DO NOTHING`,
      [sc.id, slug]
    )
  }

  // --- 2. Listings -----------------------------------------------------------------------------
  const listingsCreated = await exec.run(
    `INSERT INTO "business_listings"
       ("id","slug","name","description","listingStatus","verificationStatus","verificationChangedAt","promotionStatus",
        "isFixture","legacyServiceProviderId","createdAt","updatedAt")
     SELECT gen_random_uuid()::text,
            coalesce(nullif(trim(both '-' from left(trim(both '-' from regexp_replace(lower(sp."businessName"), '[^a-z0-9]+', '-', 'g')), 60)), ''), 'business')
              || '-' || trim(both '-' from regexp_replace(lower(left(sp."id", 12)), '[^a-z0-9]+', '-', 'g')),
            sp."businessName", sp."description",
            (CASE WHEN sp."active" THEN 'PUBLISHED' ELSE 'SUPPRESSED' END)::"BusinessListingStatus",
            (CASE WHEN sp."verified" THEN 'VERIFIED' ELSE 'UNVERIFIED' END)::"BusinessVerificationStatus",
            CASE WHEN sp."verified" THEN sp."createdAt" ELSE NULL END,
            'NONE'::"BusinessPromotionStatus",
            sp."id" LIKE $1, sp."id", sp."createdAt", ${SQL_NOW}
     FROM "service_providers" sp
     WHERE NOT EXISTS (SELECT 1 FROM "business_listings" b WHERE b."legacyServiceProviderId" = sp."id")`,
    [`${FIXTURE_ID_PREFIX}%`]
  )

  // --- 3. Categories (multi-category, one primary chosen deterministically) --------------------
  const categoryLinksCreated = await exec.run(
    `INSERT INTO "business_listing_categories" ("id","businessId","categoryId","isPrimary","createdAt")
     SELECT gen_random_uuid()::text, b."id", m."categoryId", false, ${SQL_NOW}
     FROM "service_provider_categories" spc
     JOIN "business_listings" b ON b."legacyServiceProviderId" = spc."providerId"
     JOIN "business_legacy_category_maps" m ON m."serviceCategoryId" = spc."categoryId"
     ON CONFLICT ("businessId","categoryId") DO NOTHING`
  )
  await exec.run(
    `UPDATE "business_listing_categories" lc SET "isPrimary" = true
     WHERE lc."id" IN (
       SELECT DISTINCT ON (x."businessId") x."id"
       FROM "business_listing_categories" x
       JOIN "business_listings" b ON b."id" = x."businessId" AND b."legacyServiceProviderId" IS NOT NULL
       WHERE NOT EXISTS (SELECT 1 FROM "business_listing_categories" p WHERE p."businessId" = x."businessId" AND p."isPrimary")
       ORDER BY x."businessId", x."createdAt", x."id")`
  )

  // --- 4. Service areas (legacy city + radius). Physical location is NOT invented. ---------------
  const serviceAreasCreated = await exec.run(
    `INSERT INTO "business_service_areas" ("id","businessId","areaType","city","radiusKm","createdAt")
     SELECT gen_random_uuid()::text, b."id", 'CITY'::"BusinessServiceAreaType", sa."city", sa."radius", ${SQL_NOW}
     FROM "service_areas" sa
     JOIN "business_listings" b ON b."legacyServiceProviderId" = sa."providerId"
     WHERE NOT EXISTS (
       SELECT 1 FROM "business_service_areas" x
       WHERE x."businessId" = b."id" AND x."areaType" = 'CITY' AND lower(x."city") = lower(sa."city"))`
  )

  // --- 5. Optional user association. Fake placeholder accounts are never linked. ----------------
  const userLinksCreated = await exec.run(
    `INSERT INTO "business_user_links" ("id","businessId","userId","relation","createdAt")
     SELECT gen_random_uuid()::text, b."id", sp."userId", 'LEGACY_ACCOUNT'::"BusinessUserRelation", ${SQL_NOW}
     FROM "service_providers" sp
     JOIN "business_listings" b ON b."legacyServiceProviderId" = sp."id"
     JOIN "users" u ON u."id" = sp."userId"
     WHERE u."email" NOT LIKE $1
     ON CONFLICT ("businessId","userId") DO NOTHING`,
    [`%${PLACEHOLDER_EMAIL_SUFFIX}`]
  )
  const placeholder = await exec.all<{ n: number }>(
    `SELECT count(*)::int AS n FROM "service_providers" sp JOIN "users" u ON u."id" = sp."userId" WHERE u."email" LIKE $1`,
    [`%${PLACEHOLDER_EMAIL_SUFFIX}`]
  )

  // --- 6. Field provenance ------------------------------------------------------------------------
  const provenanceRowsCreated = await exec.run(
    `INSERT INTO "business_field_provenance"
       ("id","businessId","fieldName","dataSourceId","origin","licenceBasis","displayPolicy","obtainedAt","lastCheckedAt","notes","createdAt","updatedAt")
     SELECT gen_random_uuid()::text, b."id", f.name, ds."id", 'MIGRATED_LEGACY'::"BusinessFieldOrigin", ds."licenceBasis",
            'PUBLIC'::"BusinessDisplayPolicy", sp."createdAt", ${SQL_NOW}, 'Backfilled from legacy service_providers', ${SQL_NOW}, ${SQL_NOW}
     FROM "business_listings" b
     JOIN "service_providers" sp ON sp."id" = b."legacyServiceProviderId"
     CROSS JOIN (VALUES ('name'), ('description'), ('categories'), ('serviceAreas')) AS f(name)
     JOIN "business_data_sources" ds ON ds."key" = CASE WHEN b."isFixture" THEN 'fixture' ELSE 'legacy_provider' END
     WHERE f.name <> 'description' OR b."description" IS NOT NULL
     ON CONFLICT ("businessId","fieldName","dataSourceId") DO NOTHING`
  )

  // --- 7. Audit trail -----------------------------------------------------------------------------
  const auditRowsCreated = await exec.run(
    `INSERT INTO "business_audit_logs" ("id","businessId","actorId","action","entityType","entityId","after","reason","createdAt")
     SELECT gen_random_uuid()::text, b."id", NULL, 'LISTING_BACKFILLED', 'BusinessListing', b."id",
            jsonb_build_object('legacyServiceProviderId', b."legacyServiceProviderId", 'isFixture', b."isFixture"),
            'Phase 1 backfill from legacy ServiceProvider', ${SQL_NOW}
     FROM "business_listings" b
     WHERE b."legacyServiceProviderId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "business_audit_logs" a WHERE a."businessId" = b."id" AND a."action" = 'LISTING_BACKFILLED')`
  )

  const fixtures = await exec.all<{ n: number }>(`SELECT count(*)::int AS n FROM "business_listings" WHERE "isFixture"`)

  return {
    legacyCategoriesMapped: mapped,
    legacyCategoriesImported: imported,
    listingsCreated,
    categoryLinksCreated,
    serviceAreasCreated,
    userLinksCreated,
    placeholderAccountsNotLinked: placeholder[0]?.n ?? 0,
    provenanceRowsCreated,
    auditRowsCreated,
    fixtureListings: fixtures[0]?.n ?? 0,
  }
}
