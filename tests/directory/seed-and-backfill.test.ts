import type { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { backfillBusinessDirectory } from '../../src/lib/directory/backfill'
import { seedDataSources, DATA_SOURCES } from '../../src/lib/directory/sources-data'
import { seedTaxonomy } from '../../src/lib/directory/taxonomy-seed'
import { LEAF_COUNT, TAXONOMY } from '../../src/lib/directory/taxonomy-data'
import { SLUG_REGEX } from '../../src/lib/directory/slug'
import { count, insertLegacyCategory, insertLegacyProvider, insertStages, insertUser, migratedDb, pgliteExecutor } from './helpers'

let db: PGlite
beforeEach(async () => { db = await migratedDb() })
afterEach(async () => { await db.close() })

async function snapshotCounts() {
  const tables = ['business_categories', 'business_category_stages', 'business_category_external_mappings', 'business_data_sources', 'business_listings', 'business_listing_categories', 'business_service_areas', 'business_user_links', 'business_field_provenance', 'business_audit_logs', 'business_legacy_category_maps']
  const out: Record<string, number> = {}
  for (const t of tables) out[t] = await count(db, t)
  return out
}

describe('data source registry seed', () => {
  it('creates the registry with restrictive defaults for external sources', async () => {
    const exec = pgliteExecutor(db)
    expect((await seedDataSources(exec)).created).toBe(DATA_SOURCES.length)
    const { rows } = await db.query<Record<string, unknown>>(`SELECT key, "publicDisplayAllowed", "imagesAllowed", "policyReviewStatus", "isActive", "permittedFields" FROM business_data_sources ORDER BY key`)
    const byKey = Object.fromEntries(rows.map((r) => [r.key as string, r]))
    for (const k of ['google_places', 'openstreetmap']) {
      expect(byKey[k]).toMatchObject({ publicDisplayAllowed: false, imagesAllowed: false, policyReviewStatus: 'NEEDS_HUMAN_REVIEW', isActive: false })
    }
    expect(byKey.google_places.permittedFields).toEqual(['place_id'])
    expect(byKey.fixture).toMatchObject({ policyReviewStatus: 'APPROVED' })
  })

  it('is idempotent and never overwrites an administrator policy review', async () => {
    const exec = pgliteExecutor(db)
    await seedDataSources(exec)
    await db.query(`UPDATE business_data_sources SET "policyReviewStatus" = 'APPROVED', "publicDisplayAllowed" = true, notes = 'reviewed by legal' WHERE key = 'openstreetmap'`)
    expect((await seedDataSources(exec)).created).toBe(0)
    const { rows } = await db.query(`SELECT "policyReviewStatus", "publicDisplayAllowed", notes FROM business_data_sources WHERE key = 'openstreetmap'`)
    expect(rows[0]).toEqual({ policyReviewStatus: 'APPROVED', publicDisplayAllowed: true, notes: 'reviewed by legal' })
  })
})

describe('taxonomy seed', () => {
  it('creates every group and subcategory with the right hierarchy', async () => {
    await insertStages(db)
    const r = await seedTaxonomy(pgliteExecutor(db))
    expect(r.groupsCreated).toBe(18)
    expect(r.categoriesCreated).toBe(LEAF_COUNT)
    expect(await count(db, 'business_categories', `"parentId" IS NULL`)).toBe(18)
    expect(await count(db, 'business_categories', `"parentId" IS NOT NULL`)).toBe(LEAF_COUNT)
    const { rows } = await db.query<{ name: string; n: number }>(
      `SELECT p.name, count(c.id)::int AS n FROM business_categories p JOIN business_categories c ON c."parentId" = p.id GROUP BY p.name`)
    for (const g of TAXONOMY) expect(rows.find((x) => x.name === g.name)?.n, g.name).toBe(g.children.length)
  })

  it('stores valid slugs, synonyms and discovery terms, all active', async () => {
    await seedTaxonomy(pgliteExecutor(db))
    const { rows } = await db.query<{ slug: string; synonyms: string[]; discoveryTerms: string[]; isActive: boolean; parentId: string | null }>(
      `SELECT slug, synonyms, "discoveryTerms", "isActive", "parentId" FROM business_categories`)
    for (const r of rows) { expect(r.slug).toMatch(SLUG_REGEX); expect(r.isActive).toBe(true) }
    const electrician = rows.find((r) => r.slug === 'electrician')!
    expect(electrician.synonyms).toContain('wireman')
    expect(electrician.discoveryTerms).toContain('electrician')
    for (const r of rows.filter((x) => x.parentId)) expect(r.discoveryTerms.length, r.slug).toBeGreaterThan(0)
  })

  it('is idempotent: a second run creates nothing and changes no row counts', async () => {
    await insertStages(db)
    const exec = pgliteExecutor(db)
    await seedTaxonomy(exec)
    const before = await snapshotCounts()
    const again = await seedTaxonomy(exec)
    expect(again).toEqual({ groupsCreated: 0, categoriesCreated: 0, stageMappingsCreated: 0, externalMappingsCreated: 0 })
    expect(await snapshotCounts()).toEqual(before)
  })

  it('never overwrites administrator edits when re-seeded', async () => {
    const exec = pgliteExecutor(db)
    await seedTaxonomy(exec)
    await db.query(`UPDATE business_categories SET name = 'Wireman (renamed)', "isActive" = false, synonyms = '{custom}', "displayOrder" = 999, "defaultRadiusKm" = 25 WHERE slug = 'electrician'`)
    await seedTaxonomy(exec)
    const { rows } = await db.query(`SELECT name, "isActive", synonyms, "displayOrder", "defaultRadiusKm" FROM business_categories WHERE slug = 'electrician'`)
    expect(rows[0]).toEqual({ name: 'Wireman (renamed)', isActive: false, synonyms: ['custom'], displayOrder: 999, defaultRadiusKm: 25 })
  })

  it('maps categories to stages many-to-many with relevance, using whichever stage names exist', async () => {
    await insertStages(db)
    await seedTaxonomy(pgliteExecutor(db))
    const q = async (slug: string) => (await db.query<{ name: string; relevance: number }>(
      `SELECT s.name, cs.relevance FROM business_category_stages cs JOIN business_categories c ON c.id = cs."categoryId" JOIN stages s ON s.id = cs."stageId" WHERE c.slug = $1 ORDER BY s.name`, [slug])).rows
    expect(await q('electrician')).toEqual([{ name: 'Finishing', relevance: 1 }, { name: 'MEP', relevance: 2 }])
    const gc = await q('general-contractor')
    expect(gc.map((x) => x.name)).toEqual(['Finishing', 'Foundation', 'Structure'])
    expect(gc.find((x) => x.name === 'Foundation')!.relevance).toBe(2)
  })

  it('creates a category even when none of its stages exist (stage never gates a category)', async () => {
    await seedTaxonomy(pgliteExecutor(db)) // no stages table rows at all
    expect(await count(db, 'business_categories', `"parentId" IS NOT NULL`)).toBe(LEAF_COUNT)
    expect(await count(db, 'business_category_stages')).toBe(0)
  })

  it('picks up stage mappings later when stages appear (alternate naming scheme)', async () => {
    const exec = pgliteExecutor(db)
    await seedTaxonomy(exec)
    await insertStages(db, ['Planning', 'Walls & Masonry', 'Utilities'])
    const again = await seedTaxonomy(exec)
    expect(again.categoriesCreated).toBe(0)
    expect(again.stageMappingsCreated).toBeGreaterThan(0)
    const { rows } = await db.query<{ name: string }>(
      `SELECT s.name FROM business_category_stages cs JOIN business_categories c ON c.id = cs."categoryId" JOIN stages s ON s.id = cs."stageId" WHERE c.slug = 'architect'`)
    expect(rows.map((r) => r.name)).toContain('Planning')
  })

  it('stores proposed external mappings for review', async () => {
    await seedTaxonomy(pgliteExecutor(db))
    const { rows } = await db.query<{ sourceKey: string; externalCode: string }>(
      `SELECT m."sourceKey", m."externalCode" FROM business_category_external_mappings m JOIN business_categories c ON c.id = m."categoryId" WHERE c.slug = 'electrician' ORDER BY 1, 2`)
    expect(rows).toEqual([{ sourceKey: 'google_places', externalCode: 'electrician' }, { sourceKey: 'osm', externalCode: 'craft=electrician' }])
  })
})

describe('backfill from legacy providers', () => {
  async function prepare() {
    const exec = pgliteExecutor(db)
    await insertStages(db)
    await seedDataSources(exec)
    await seedTaxonomy(exec)

    await insertUser(db, 'u-real', 'owner@realbiz.example')
    await insertUser(db, 'u-fake', 'provider-123@hcos.placeholder')
    await insertUser(db, 'u-demo', 'ravi@brightspark.example.com')
    for (const [id, name] of [['c-elec', 'Electrical'], ['c-plumb', 'Plumbing'], ['c-carp', 'Carpenter'], ['c-weird', 'Weird Trade & Co.']]) await insertLegacyCategory(db, id, name)

    await insertLegacyProvider(db, { id: '3f2b8a52-6f0e-4d3a-9d1e-0a1b2c3d4e5f', userId: 'u-real', name: 'Real Sparks & Sons', description: 'Wiring experts', verified: true, active: true, categories: ['c-elec', 'c-plumb'], areas: [['Bangalore', 50], ['Mumbai', 100]] })
    await insertLegacyProvider(db, { id: '9a1c0000-0000-4000-8000-000000000001', userId: 'u-fake', name: '!!!', verified: false, active: false, categories: ['c-carp', 'c-weird'] })
    await insertLegacyProvider(db, { id: 'demo-sp-1', userId: 'u-demo', name: 'BrightSpark Electricals', description: 'Demo', verified: true, categories: ['c-elec'], areas: [['Bangalore', 50]] })
    return exec
  }

  it('refuses to run before data sources and taxonomy exist', async () => {
    await expect(backfillBusinessDirectory(pgliteExecutor(db))).rejects.toThrow(/Data sources are not seeded/)
    await seedDataSources(pgliteExecutor(db))
    await insertLegacyCategory(db, 'c1', 'Electrical')
    await expect(backfillBusinessDirectory(pgliteExecutor(db))).rejects.toThrow(/Taxonomy is not seeded/)
  })

  it('creates one listing per legacy provider with preserved status, verification and valid unique slugs', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.listingsCreated).toBe(3)
    const { rows } = await db.query<{ legacyServiceProviderId: string; slug: string; name: string; listingStatus: string; verificationStatus: string; isFixture: boolean; promotionStatus: string }>(
      `SELECT "legacyServiceProviderId", slug, name, "listingStatus", "verificationStatus", "isFixture", "promotionStatus" FROM business_listings ORDER BY name`)
    expect(new Set(rows.map((x) => x.slug)).size).toBe(3)
    for (const x of rows) { expect(x.slug, x.slug).toMatch(SLUG_REGEX); expect(x.promotionStatus).toBe('NONE') }
    const real = rows.find((x) => x.name === 'Real Sparks & Sons')!
    expect(real).toMatchObject({ listingStatus: 'PUBLISHED', verificationStatus: 'VERIFIED', isFixture: false })
    expect(real.slug.startsWith('real-sparks-sons-')).toBe(true)
    const inactive = rows.find((x) => x.name === '!!!')!
    expect(inactive).toMatchObject({ listingStatus: 'SUPPRESSED', verificationStatus: 'UNVERIFIED' })
    expect(inactive.slug.startsWith('business-')).toBe(true) // fallback for an unusable name
  })

  it('flags demo providers as fixtures, with fixture provenance, and nothing else', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.fixtureListings).toBe(1)
    expect(await count(db, 'business_listings', `"isFixture"`)).toBe(1)
    const { rows } = await db.query<{ key: string }>(
      `SELECT ds.key FROM business_field_provenance p JOIN business_data_sources ds ON ds.id = p."dataSourceId" JOIN business_listings b ON b.id = p."businessId" WHERE b."isFixture"`)
    expect(new Set(rows.map((x) => x.key))).toEqual(new Set(['fixture']))
    const real = await db.query<{ key: string }>(
      `SELECT DISTINCT ds.key FROM business_field_provenance p JOIN business_data_sources ds ON ds.id = p."dataSourceId" JOIN business_listings b ON b.id = p."businessId" WHERE NOT b."isFixture"`)
    expect(real.rows.map((x) => x.key)).toEqual(['legacy_provider'])
  })

  it('maps legacy categories to the new taxonomy and imports unknown ones without losing them', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.legacyCategoriesMapped).toBe(3)
    expect(r.legacyCategoriesImported).toBe(1)
    const m = await db.query<{ name: string; slug: string }>(
      `SELECT sc.name, c.slug FROM business_legacy_category_maps m JOIN service_categories sc ON sc.id = m."serviceCategoryId" JOIN business_categories c ON c.id = m."categoryId" ORDER BY sc.name`)
    expect(m.rows).toEqual([
      { name: 'Carpenter', slug: 'carpenter-woodwork' }, { name: 'Electrical', slug: 'electrician' },
      { name: 'Plumbing', slug: 'plumber' }, { name: 'Weird Trade & Co.', slug: 'legacy-weird-trade-and-co' },
    ])
    const legacy = await db.query<{ parent: string }>(`SELECT p.slug AS parent FROM business_categories c JOIN business_categories p ON p.id = c."parentId" WHERE c.slug = 'legacy-weird-trade-and-co'`)
    expect(legacy.rows[0].parent).toBe('specialist-services')
  })

  it('keeps multiple categories per business with exactly one primary', async () => {
    const exec = await prepare()
    await backfillBusinessDirectory(exec)
    const { rows } = await db.query<{ name: string; n: number; primaries: number }>(
      `SELECT b.name, count(*)::int AS n, count(*) FILTER (WHERE lc."isPrimary")::int AS primaries
       FROM business_listing_categories lc JOIN business_listings b ON b.id = lc."businessId" GROUP BY b.name ORDER BY b.name`)
    expect(rows).toEqual([
      { name: '!!!', n: 2, primaries: 1 },
      { name: 'BrightSpark Electricals', n: 1, primaries: 1 },
      { name: 'Real Sparks & Sons', n: 2, primaries: 1 },
    ])
  })

  it('carries legacy service areas as CITY areas and does NOT invent a physical location', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.serviceAreasCreated).toBe(3)
    const { rows } = await db.query<{ city: string; radiusKm: number; areaType: string }>(
      `SELECT sa.city, sa."radiusKm", sa."areaType" FROM business_service_areas sa JOIN business_listings b ON b.id = sa."businessId" WHERE b.name = 'Real Sparks & Sons' ORDER BY sa.city`)
    expect(rows).toEqual([{ city: 'Bangalore', radiusKm: 50, areaType: 'CITY' }, { city: 'Mumbai', radiusKm: 100, areaType: 'CITY' }])
    expect(await count(db, 'business_locations')).toBe(0)
  })

  it('links real accounts but never fake placeholder accounts', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.userLinksCreated).toBe(2)
    expect(r.placeholderAccountsNotLinked).toBe(1)
    const { rows } = await db.query<{ email: string; relation: string }>(
      `SELECT u.email, l.relation FROM business_user_links l JOIN users u ON u.id = l."userId" ORDER BY u.email`)
    expect(rows.map((x) => x.email)).toEqual(['owner@realbiz.example', 'ravi@brightspark.example.com'])
    expect(rows.every((x) => x.relation === 'LEGACY_ACCOUNT')).toBe(true)
    // The placeholder provider still got a listing: it just has no user association.
    expect(await count(db, 'business_listings', `name = '!!!'`)).toBe(1)
  })

  it('records provenance for migrated fields (description only when present) and one audit row per listing', async () => {
    const exec = await prepare()
    const r = await backfillBusinessDirectory(exec)
    expect(r.provenanceRowsCreated).toBe(4 + 3 + 4) // real: 4, '!!!' (no description): 3, demo: 4
    expect(r.auditRowsCreated).toBe(3)
    const { rows } = await db.query<{ origin: string; displayPolicy: string }>(`SELECT DISTINCT origin, "displayPolicy" FROM business_field_provenance`)
    expect(rows).toEqual([{ origin: 'MIGRATED_LEGACY', displayPolicy: 'PUBLIC' }])
    const a = await db.query<{ action: string; actorId: string | null }>(`SELECT DISTINCT action, "actorId" FROM business_audit_logs`)
    expect(a.rows).toEqual([{ action: 'LISTING_BACKFILLED', actorId: null }])
  })

  it('is idempotent: running it again creates nothing', async () => {
    const exec = await prepare()
    await backfillBusinessDirectory(exec)
    const before = await snapshotCounts()
    const again = await backfillBusinessDirectory(exec)
    expect(again).toMatchObject({
      legacyCategoriesMapped: 0, legacyCategoriesImported: 0, listingsCreated: 0, categoryLinksCreated: 0, serviceAreasCreated: 0,
      userLinksCreated: 0, provenanceRowsCreated: 0, auditRowsCreated: 0,
    })
    expect(await snapshotCounts()).toEqual(before)
  })

  it('picks up only newly added providers on a later run', async () => {
    const exec = await prepare()
    await backfillBusinessDirectory(exec)
    await insertUser(db, 'u-new', 'new@example.com')
    await insertLegacyProvider(db, { id: 'new-provider-1', userId: 'u-new', name: 'Late Joiner', categories: ['c-plumb'], areas: [['Pune', 40]] })
    const r = await backfillBusinessDirectory(exec)
    expect(r.listingsCreated).toBe(1)
    expect(r.categoryLinksCreated).toBe(1)
    expect(r.serviceAreasCreated).toBe(1)
    expect(await count(db, 'business_listings')).toBe(4)
  })

  it('never modifies the legacy tables', async () => {
    const exec = await prepare()
    const dump = async () => JSON.stringify([
      (await db.query(`SELECT * FROM service_providers ORDER BY id`)).rows,
      (await db.query(`SELECT * FROM service_provider_categories ORDER BY id`)).rows,
      (await db.query(`SELECT * FROM service_areas ORDER BY id`)).rows,
      (await db.query(`SELECT * FROM service_categories ORDER BY id`)).rows,
      (await db.query(`SELECT * FROM users ORDER BY id`)).rows,
    ])
    const before = await dump()
    await backfillBusinessDirectory(exec)
    await backfillBusinessDirectory(exec)
    expect(await dump()).toBe(before)
  })

  it('rolls back completely when a step fails (all-or-nothing inside a transaction)', async () => {
    const exec = await prepare()
    await db.query('BEGIN')
    await backfillBusinessDirectory(exec)
    expect(await count(db, 'business_listings')).toBe(3)
    await db.query('ROLLBACK')
    expect(await count(db, 'business_listings')).toBe(0)
    expect(await count(db, 'business_legacy_category_maps')).toBe(0)
  })
})
