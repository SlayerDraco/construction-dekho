import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyDirectoryConstraints, DIRECTORY_CONSTRAINTS } from '../../src/lib/directory/constraints'
import { count, insertLegacyCategory, insertLegacyProvider, insertUser, legacyDb, LEGACY_SQL, MIGRATION_SQL, MIGRATION_DDL_ONLY, migratedDb, pgliteExecutor } from './helpers'

const LEGACY_TABLES = ['users', 'stages', 'service_categories', 'service_providers', 'service_provider_categories', 'service_areas', 'claim_requests']

async function legacyShape(db: PGlite) {
  const cols = await db.query(`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ANY($1) ORDER BY table_name, ordinal_position`, [LEGACY_TABLES])
  const cons = await db.query(`SELECT conrelid::regclass::text AS tbl, conname, contype, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid::regclass::text = ANY($1) ORDER BY 1, 2`, [LEGACY_TABLES])
  const idx = await db.query(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE tablename = ANY($1) ORDER BY 1, 2`, [LEGACY_TABLES])
  return JSON.stringify([cols.rows, cons.rows, idx.rows])
}

describe('migration is additive and non-destructive', () => {
  it('leaves every pre-existing table byte-for-byte unchanged', async () => {
    const before = await legacyDb()
    const after = await migratedDb()
    expect(await legacyShape(after)).toBe(await legacyShape(before))
    await before.close(); await after.close()
  })

  it('contains no destructive statements', () => {
    const sql = MIGRATION_SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
    for (const bad of [/\bDROP\b/i, /\bTRUNCATE\b/i, /\bDELETE\s+FROM\b/i, /\bRENAME\b/i, /\bALTER\s+TABLE\s+"(users|stages|service_\w+|claim_requests|reviews|house\w*)"\s+(DROP|ALTER|RENAME)/i]) {
      expect(sql).not.toMatch(bad)
    }
    // Every ALTER TABLE targets a new business_* table.
    for (const m of sql.matchAll(/ALTER TABLE "([^"]+)"/g)) expect(m[1], m[0]).toMatch(/^business_/)
  })

  it('preserves existing rows through the migration', async () => {
    const db = await legacyDb()
    await insertUser(db, 'u1', 'a@example.com')
    await insertLegacyCategory(db, 'c1', 'Electrical')
    await insertLegacyProvider(db, { id: 'p1', userId: 'u1', name: 'Existing Co', categories: ['c1'], areas: [['Pune', 50]] })
    await db.exec(MIGRATION_SQL)
    expect(await count(db, 'users')).toBe(1)
    expect(await count(db, 'service_providers')).toBe(1)
    expect(await count(db, 'service_provider_categories')).toBe(1)
    expect(await count(db, 'service_areas')).toBe(1)
    await db.close()
  })
})

describe('domain model guarantees', () => {
  let db: PGlite
  beforeAll(async () => { db = await migratedDb() })
  afterAll(async () => { await db.close() })

  const listing = (id: string, slug = id) =>
    db.query(`INSERT INTO business_listings (id, slug, name, "updatedAt") VALUES ($1, $2, 'Test Business', now())`, [id, slug])

  it('lets a business exist without any ConstructionDekho user', async () => {
    await listing('b-nouser')
    expect(await count(db, 'users')).toBe(0)
    expect(await count(db, 'business_listings', `id = 'b-nouser'`)).toBe(1)
    expect(await count(db, 'business_user_links', `"businessId" = 'b-nouser'`)).toBe(0)
  })

  it('defaults to DRAFT / UNVERIFIED / no promotion, never fixture, with promotion independent of verification', async () => {
    const { rows } = await db.query<Record<string, unknown>>(`SELECT "listingStatus","verificationStatus","promotionStatus","isFixture" FROM business_listings WHERE id = 'b-nouser'`)
    expect(rows[0]).toEqual({ listingStatus: 'DRAFT', verificationStatus: 'UNVERIFIED', promotionStatus: 'NONE', isFixture: false })
    await db.query(`UPDATE business_listings SET "promotionStatus" = 'FEATURED' WHERE id = 'b-nouser'`)
    const r = await db.query<Record<string, unknown>>(`SELECT "verificationStatus","promotionStatus" FROM business_listings WHERE id = 'b-nouser'`)
    expect(r.rows[0]).toEqual({ verificationStatus: 'UNVERIFIED', promotionStatus: 'FEATURED' })
  })

  it('supports a business in multiple categories (and rejects duplicates)', async () => {
    await listing('b-multi')
    await db.query(`INSERT INTO business_categories (id, slug, name, synonyms, "discoveryTerms", "updatedAt") VALUES ('cat-a','cat-a','A','{}','{}',now()),('cat-b','cat-b','B','{}','{}',now())`)
    await db.query(`INSERT INTO business_listing_categories (id, "businessId", "categoryId", "isPrimary") VALUES ('l1','b-multi','cat-a',true),('l2','b-multi','cat-b',false)`)
    expect(await count(db, 'business_listing_categories', `"businessId" = 'b-multi'`)).toBe(2)
    await expect(db.query(`INSERT INTO business_listing_categories (id, "businessId", "categoryId") VALUES ('l3','b-multi','cat-a')`)).rejects.toThrow()
  })

  it('stores physical location separately from many service areas', async () => {
    await listing('b-geo')
    await db.query(`INSERT INTO business_locations (id, "businessId", city, state, pincode, latitude, longitude, "updatedAt") VALUES ('loc1','b-geo','Ludhiana','Punjab','141001',30.9,75.85, now())`)
    await db.query(`INSERT INTO business_service_areas (id, "businessId", "areaType", pincode) VALUES ('sa1','b-geo','PINCODE','141002'),('sa2','b-geo','PINCODE','141003')`)
    await db.query(`INSERT INTO business_service_areas (id, "businessId", "areaType", city) VALUES ('sa3','b-geo','CITY','Jalandhar')`)
    await db.query(`INSERT INTO business_service_areas (id, "businessId", "areaType", "centerLatitude","centerLongitude","radiusKm") VALUES ('sa4','b-geo','RADIUS',30.9,75.85,50)`)
    await db.query(`INSERT INTO business_service_areas (id, "businessId", "areaType", state) VALUES ('sa5','b-geo','STATE','Punjab')`)
    expect(await count(db, 'business_locations', `"businessId" = 'b-geo'`)).toBe(1)
    expect(await count(db, 'business_service_areas', `"businessId" = 'b-geo'`)).toBe(5)
    const { rows } = await db.query<{ country: string }>(`SELECT country FROM business_locations WHERE id = 'loc1'`)
    expect(rows[0].country).toBe('IN')
  })

  it('keeps source identifiers apart from the business and from profile data', async () => {
    await listing('b-src')
    await db.query(`INSERT INTO business_data_sources (id, key, name, kind, "permittedFields", "updatedAt") VALUES ('ds1','src_a','A','EXTERNAL_API','{place_id}', now()),('ds2','src_b','B','OPEN_DATA','{}', now())`)
    await db.query(`INSERT INTO business_source_records (id, "dataSourceId", "businessId", "externalId", "updatedAt") VALUES ('sr1','ds1','b-src','ext-1', now()),('sr2','ds2','b-src','ext-1', now())`)
    // Same external id in different sources is fine; the same source cannot be recorded twice.
    await expect(db.query(`INSERT INTO business_source_records (id, "dataSourceId", "externalId", "updatedAt") VALUES ('sr3','ds1','ext-1', now())`)).rejects.toThrow()
    // A source record can exist before it is matched to any business.
    await db.query(`INSERT INTO business_source_records (id, "dataSourceId", "externalId", "updatedAt") VALUES ('sr4','ds1','ext-2', now())`)
    expect((await db.query(`SELECT "rawPayload" FROM business_source_records WHERE id = 'sr1'`)).rows[0]).toEqual({ rawPayload: null })
    // Field provenance is unique per (business, field, source) but may differ across sources.
    await db.query(`INSERT INTO business_field_provenance (id, "businessId", "fieldName", "dataSourceId", origin, "updatedAt") VALUES ('fp1','b-src','phone','ds1','SOURCE_PROVIDED', now()),('fp2','b-src','phone','ds2','VENDOR_SUPPLIED', now())`)
    await expect(db.query(`INSERT INTO business_field_provenance (id, "businessId", "fieldName", "dataSourceId", origin, "updatedAt") VALUES ('fp3','b-src','phone','ds1','ADMIN_EDITED', now())`)).rejects.toThrow()
    const dp = await db.query<{ displayPolicy: string }>(`SELECT "displayPolicy" FROM business_field_provenance WHERE id = 'fp1'`)
    expect(dp.rows[0].displayPolicy).toBe('INTERNAL_ONLY') // restrictive by default
  })

  it('defaults data sources to the most restrictive handling', async () => {
    const { rows } = await db.query<Record<string, unknown>>(`SELECT "publicDisplayAllowed","imagesAllowed","policyReviewStatus","isActive" FROM business_data_sources WHERE id = 'ds1'`)
    expect(rows[0]).toEqual({ publicDisplayAllowed: false, imagesAllowed: false, policyReviewStatus: 'NEEDS_HUMAN_REVIEW', isActive: true })
  })

  it('survives deletion of a legacy provider or a user without losing the business', async () => {
    await insertUser(db, 'ux', 'x@example.com')
    await insertLegacyProvider(db, { id: 'px', userId: 'ux', name: 'Legacy' })
    await db.query(`INSERT INTO business_listings (id, slug, name, "legacyServiceProviderId", "updatedAt") VALUES ('b-leg','b-leg','Legacy','px', now())`)
    await db.query(`INSERT INTO business_user_links (id, "businessId", "userId", relation) VALUES ('ul1','b-leg','ux','LEGACY_ACCOUNT')`)
    await db.query(`DELETE FROM service_providers WHERE id = 'px'`)
    expect((await db.query(`SELECT "legacyServiceProviderId" FROM business_listings WHERE id = 'b-leg'`)).rows[0]).toEqual({ legacyServiceProviderId: null })
    await db.query(`DELETE FROM users WHERE id = 'ux'`)
    expect(await count(db, 'business_listings', `id = 'b-leg'`)).toBe(1)
    expect(await count(db, 'business_user_links', `"businessId" = 'b-leg'`)).toBe(0)
  })

  it('keeps audit rows when a business is removed', async () => {
    await listing('b-aud')
    await db.query(`INSERT INTO business_audit_logs (id, "businessId", action, "entityType") VALUES ('al1','b-aud','LISTING_REMOVED','BusinessListing')`)
    await db.query(`DELETE FROM business_listings WHERE id = 'b-aud'`)
    expect((await db.query(`SELECT "businessId" FROM business_audit_logs WHERE id = 'al1'`)).rows[0]).toEqual({ businessId: null })
  })

  it('refuses to delete a category that has businesses or children', async () => {
    await expect(db.query(`DELETE FROM business_categories WHERE id = 'cat-a'`)).rejects.toThrow()
    await db.query(`INSERT INTO business_categories (id, slug, name, "parentId", synonyms, "discoveryTerms", "updatedAt") VALUES ('kid','kid','Kid','cat-b','{}','{}',now())`)
    await expect(db.query(`DELETE FROM business_categories WHERE id = 'cat-b'`)).rejects.toThrow()
  })
})

describe('database-level constraints', () => {
  let db: PGlite
  beforeAll(async () => {
    db = await migratedDb()
    await db.query(`INSERT INTO business_listings (id, slug, name, "updatedAt") VALUES ('b','b','B', now())`)
  })
  afterAll(async () => { await db.close() })

  const bad = (sql: string, params: unknown[] = []) => expect(db.query(sql, params)).rejects.toThrow()

  it('rejects malformed slugs', async () => {
    for (const slug of ['Bad Slug', '-lead', 'trail-', 'double--hyphen', 'UPPER'])
      await bad(`INSERT INTO business_listings (id, slug, name, "updatedAt") VALUES ($1, $2, 'x', now())`, [`i-${slug}`, slug])
  })

  it('rejects impossible coordinates, unpaired coordinates and malformed PIN codes', async () => {
    const ins = (cols: string, vals: string) => `INSERT INTO business_locations (id, "businessId", ${cols}, "updatedAt") VALUES (gen_random_uuid()::text, 'b', ${vals}, now())`
    await bad(ins('latitude, longitude', '91, 0'))
    await bad(ins('latitude, longitude', '0, 181'))
    await bad(ins('latitude', '12'))
    await bad(ins('pincode', `'014001'`))
    await bad(ins('pincode', `'12345'`))
    await db.query(ins('pincode, latitude, longitude', `'141001', 30.9, 75.85`))
  })

  it('rejects service areas missing the fields their type needs', async () => {
    const ins = (cols: string, vals: string) => `INSERT INTO business_service_areas (id, "businessId", ${cols}) VALUES (gen_random_uuid()::text, 'b', ${vals})`
    await bad(ins('"areaType"', `'PINCODE'`))
    await bad(ins('"areaType"', `'CITY'`))
    await bad(ins('"areaType"', `'STATE'`))
    await bad(ins('"areaType", "centerLatitude"', `'RADIUS', 30.9`))
    await bad(ins('"areaType", "radiusKm"', `'NATIONWIDE', 0`))
    await db.query(ins('"areaType"', `'NATIONWIDE'`))
  })

  it('only allows an image to be APPROVED with licence or permission evidence', async () => {
    const ins = (extra: string, vals: string) => `INSERT INTO business_images (id, "businessId", url, ${extra}, "updatedAt") VALUES (gen_random_uuid()::text, 'b', 'https://x/y.jpg', ${vals}, now())`
    await bad(ins('status', `'APPROVED'`))
    await db.query(ins('status', `'PENDING'`))
    await db.query(ins('status, licence', `'APPROVED', 'CC-BY 4.0'`))
    await db.query(ins('status, "permissionEvidence"', `'APPROVED', 'Written consent 2026-01-02'`))
    await bad(`INSERT INTO business_images (id, "businessId", status, "updatedAt") VALUES ('noloc','b','PENDING', now())`)
  })

  it('rejects self-parenting and a zero default radius on categories, and bad stage relevance', async () => {
    await bad(`INSERT INTO business_categories (id, slug, name, "parentId", synonyms, "discoveryTerms", "updatedAt") VALUES ('self','self','S','self','{}','{}', now())`)
    await bad(`INSERT INTO business_categories (id, slug, name, "defaultRadiusKm", synonyms, "discoveryTerms", "updatedAt") VALUES ('r0','r0','R',0,'{}','{}', now())`)
    await db.query(`INSERT INTO stages (id, name, "displayOrder") VALUES ('st','S',1)`)
    await db.query(`INSERT INTO business_categories (id, slug, name, synonyms, "discoveryTerms", "updatedAt") VALUES ('ok','ok','Ok','{}','{}', now())`)
    await bad(`INSERT INTO business_category_stages (id, "categoryId", "stageId", relevance) VALUES ('cs','ok','st',9)`)
  })

  it('applyDirectoryConstraints adds the guards to a DDL-only (db push style) database, once', async () => {
    const pushed = await migratedDb({ ddlOnly: true })
    const exec = pgliteExecutor(pushed)
    await pushed.query(`INSERT INTO business_listings (id, slug, name, "updatedAt") VALUES ('x','Not A Slug','x', now())`) // allowed before guards
    await pushed.query(`DELETE FROM business_listings`)
    const first = await applyDirectoryConstraints(exec)
    expect(first.sort()).toEqual(DIRECTORY_CONSTRAINTS.map((c) => c.name).sort())
    expect(await applyDirectoryConstraints(exec)).toEqual([])
    await expect(pushed.query(`INSERT INTO business_listings (id, slug, name, "updatedAt") VALUES ('y','Not A Slug','x', now())`)).rejects.toThrow()
    await pushed.close()
  })

  it('the full migration and DDL-only + applyDirectoryConstraints end up with identical constraints', async () => {
    const names = async (d: PGlite) => (await d.query<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conname LIKE '%\\_chk' ESCAPE '\\' ORDER BY 1`)).rows.map((r) => r.conname)
    const pushed = await migratedDb({ ddlOnly: true })
    await applyDirectoryConstraints(pgliteExecutor(pushed))
    expect(await names(pushed)).toEqual(await names(db))
    await pushed.close()
  })

  it('exposes the DDL-only slice used by the tests', () => {
    expect(MIGRATION_DDL_ONLY).not.toContain('_chk')
    expect(LEGACY_SQL).toContain('service_providers')
  })
})

describe('rollback', () => {
  it('removes every directory object, leaves legacy data intact, and the migration can be re-applied', async () => {
    const { readFileSync } = await import('node:fs')
    const path = await import('node:path')
    const rollback = readFileSync(path.resolve(__dirname, '../../prisma/sql/001_business_directory_foundation.rollback.sql'), 'utf8')

    const db = await legacyDb()
    await insertUser(db, 'u1', 'a@example.com')
    await insertLegacyProvider(db, { id: 'p1', userId: 'u1', name: 'Keep Me' })
    const shapeBefore = await legacyShape(db)

    await db.exec(MIGRATION_SQL)
    await db.query(`INSERT INTO business_listings (id, slug, name, "legacyServiceProviderId", "updatedAt") VALUES ('b1','b1','B','p1', now())`)
    await db.exec(rollback)

    const left = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_tables WHERE tablename LIKE 'business\\_%' ESCAPE '\\'`)
    expect(left.rows[0].n).toBe(0)
    const types = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM pg_type WHERE typname LIKE 'Business%' OR typname = 'SourcePolicyReviewStatus'`)
    expect(types.rows[0].n).toBe(0)
    expect(await count(db, 'service_providers')).toBe(1)
    expect(await legacyShape(db)).toBe(shapeBefore)

    await db.exec(MIGRATION_SQL) // forward again
    expect(await count(db, 'business_listings')).toBe(0)
    await db.close()
  })
})
