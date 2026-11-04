import { SQL_NOW, type SqlExecutor } from './sql-executor'

/**
 * Data-source registry defaults. Every external source starts at the MOST RESTRICTIVE handling:
 * not displayable, no images, review required. Nothing here asserts a legal permission that has not
 * been confirmed by a human; fields marked "unreviewed" must be completed before an adapter is enabled.
 */
export interface DataSourceSeed {
  key: string
  name: string
  kind: 'INTERNAL' | 'FIXTURE' | 'EXTERNAL_API' | 'OPEN_DATA'
  licenceBasis: string | null
  licenceUrl: string | null
  attributionText: string | null
  permittedFields: string[]
  maxRetentionDays: number | null
  publicDisplayAllowed: boolean
  imagesAllowed: boolean
  refreshIntervalDays: number | null
  deletionObligations: string | null
  rateLimitNotes: string | null
  policyReviewStatus: 'NEEDS_HUMAN_REVIEW' | 'APPROVED' | 'BLOCKED'
  notes: string | null
  isActive: boolean
}

export const DATA_SOURCES: DataSourceSeed[] = [
  {
    key: 'legacy_provider',
    name: 'Legacy ServiceProvider records',
    kind: 'INTERNAL',
    licenceBasis: 'First-party data entered by ConstructionDekho users or administrators.',
    licenceUrl: null,
    attributionText: null,
    permittedFields: ['name', 'description', 'categories', 'serviceAreas'],
    maxRetentionDays: null,
    publicDisplayAllowed: true,
    imagesAllowed: false,
    refreshIntervalDays: null,
    deletionObligations: null,
    rateLimitNotes: null,
    policyReviewStatus: 'APPROVED',
    notes: 'Used by the Phase 1 backfill. Not an external source.',
    isActive: true,
  },
  {
    key: 'fixture',
    name: 'Demo / test fixtures',
    kind: 'FIXTURE',
    licenceBasis: 'Synthetic records created for demos and tests.',
    licenceUrl: null,
    attributionText: null,
    permittedFields: ['name', 'description', 'categories', 'serviceAreas'],
    maxRetentionDays: null,
    publicDisplayAllowed: true,
    imagesAllowed: false,
    refreshIntervalDays: null,
    deletionObligations: null,
    rateLimitNotes: null,
    policyReviewStatus: 'APPROVED',
    notes: 'Records from this source are NOT real businesses and must never be presented as discovered businesses. Listings carry isFixture = true.',
    isActive: true,
  },
  {
    key: 'admin_manual',
    name: 'Administrator entry',
    kind: 'INTERNAL',
    licenceBasis: 'Entered or confirmed by a ConstructionDekho administrator.',
    licenceUrl: null,
    attributionText: null,
    permittedFields: ['*'],
    maxRetentionDays: null,
    publicDisplayAllowed: true,
    imagesAllowed: true,
    refreshIntervalDays: null,
    deletionObligations: null,
    rateLimitNotes: null,
    policyReviewStatus: 'APPROVED',
    notes: 'Images still require recorded licence or permission evidence before approval.',
    isActive: true,
  },
  {
    key: 'vendor_supplied',
    name: 'Vendor-supplied correction or request',
    kind: 'INTERNAL',
    licenceBasis: 'Supplied by the business itself through a correction or removal request. Applied only after administrator review.',
    licenceUrl: null,
    attributionText: null,
    permittedFields: ['*'],
    maxRetentionDays: null,
    publicDisplayAllowed: true,
    imagesAllowed: true,
    refreshIntervalDays: null,
    deletionObligations: 'Honour removal requests after administrator review.',
    rateLimitNotes: null,
    policyReviewStatus: 'APPROVED',
    notes: 'Vendors never edit profiles directly. Images still require permission evidence.',
    isActive: true,
  },
  {
    key: 'google_places',
    name: 'Google Places (optional adapter)',
    kind: 'EXTERNAL_API',
    licenceBasis: null,
    licenceUrl: null,
    attributionText: null,
    permittedFields: ['place_id'],
    maxRetentionDays: null,
    publicDisplayAllowed: false,
    imagesAllowed: false,
    refreshIntervalDays: null,
    deletionObligations: 'Unreviewed. Must be established from the current terms before enabling.',
    rateLimitNotes: 'Unreviewed. Paid API: out of scope for the demo.',
    policyReviewStatus: 'NEEDS_HUMAN_REVIEW',
    notes: 'Not enabled. Until a human reviews the current terms, only the Place ID may be persisted and nothing else displayed. No scraping or unofficial endpoints. Google ratings must never be shown as ConstructionDekho ratings.',
    isActive: false,
  },
  {
    key: 'openstreetmap',
    name: 'OpenStreetMap (open data)',
    kind: 'OPEN_DATA',
    licenceBasis: 'Open Database Licence (ODbL) 1.0: attribution and share-alike obligations. How share-alike applies to a derived directory is unreviewed.',
    licenceUrl: 'https://www.openstreetmap.org/copyright',
    attributionText: '© OpenStreetMap contributors',
    permittedFields: [],
    maxRetentionDays: null,
    publicDisplayAllowed: false,
    imagesAllowed: false,
    refreshIntervalDays: null,
    deletionObligations: 'Unreviewed.',
    rateLimitNotes: 'Public community endpoints must not be used for bulk extraction. Use a licensed/self-hosted extract or a provider that permits the volume.',
    policyReviewStatus: 'NEEDS_HUMAN_REVIEW',
    notes: 'Not enabled. A human must confirm licence handling and permitted fields before any adapter runs.',
    isActive: false,
  },
]

/** Inserts missing sources. Existing rows are never overwritten so administrator policy reviews survive re-seeding. */
export async function seedDataSources(exec: SqlExecutor): Promise<{ created: number }> {
  const rows = await exec.all(
    `INSERT INTO "business_data_sources"
       ("id","key","name","kind","licenceBasis","licenceUrl","attributionText","permittedFields","maxRetentionDays",
        "publicDisplayAllowed","imagesAllowed","refreshIntervalDays","deletionObligations","rateLimitNotes",
        "policyReviewStatus","notes","isActive","createdAt","updatedAt")
     SELECT gen_random_uuid()::text, m.key, m.name, m.kind, m."licenceBasis", m."licenceUrl", m."attributionText",
            ARRAY(SELECT jsonb_array_elements_text(m."permittedFields")), m."maxRetentionDays",
            m."publicDisplayAllowed", m."imagesAllowed", m."refreshIntervalDays", m."deletionObligations", m."rateLimitNotes",
            m."policyReviewStatus"::"SourcePolicyReviewStatus", m.notes, m."isActive", ${SQL_NOW}, ${SQL_NOW}
     FROM jsonb_to_recordset($1::jsonb) AS m(
       key text, name text, kind text, "licenceBasis" text, "licenceUrl" text, "attributionText" text,
       "permittedFields" jsonb, "maxRetentionDays" int, "publicDisplayAllowed" boolean, "imagesAllowed" boolean,
       "refreshIntervalDays" int, "deletionObligations" text, "rateLimitNotes" text, "policyReviewStatus" text,
       notes text, "isActive" boolean)
     ON CONFLICT ("key") DO NOTHING
     RETURNING "key"`,
    [JSON.stringify(DATA_SOURCES)]
  )
  return { created: rows.length }
}
