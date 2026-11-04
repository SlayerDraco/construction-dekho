import type { SqlExecutor } from './sql-executor'

/**
 * Database-level guards that Prisma's schema language cannot express.
 * Prisma ignores CHECK constraints, so they are applied separately and idempotently.
 * They are also appended to prisma/sql/001_business_directory_foundation.sql.
 */
export interface DirectoryConstraint {
  name: string
  table: string
  check: string
}

export const DIRECTORY_CONSTRAINTS: DirectoryConstraint[] = [
  { name: 'business_listings_slug_format_chk', table: 'business_listings', check: `"slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` },
  { name: 'business_locations_lat_range_chk', table: 'business_locations', check: `"latitude" IS NULL OR "latitude" BETWEEN -90 AND 90` },
  { name: 'business_locations_lng_range_chk', table: 'business_locations', check: `"longitude" IS NULL OR "longitude" BETWEEN -180 AND 180` },
  { name: 'business_locations_coords_pair_chk', table: 'business_locations', check: `("latitude" IS NULL) = ("longitude" IS NULL)` },
  { name: 'business_locations_pincode_format_chk', table: 'business_locations', check: `"pincode" IS NULL OR "pincode" ~ '^[1-9][0-9]{5}$'` },
  { name: 'business_service_areas_radius_pos_chk', table: 'business_service_areas', check: `"radiusKm" IS NULL OR "radiusKm" > 0` },
  { name: 'business_service_areas_pincode_format_chk', table: 'business_service_areas', check: `"pincode" IS NULL OR "pincode" ~ '^[1-9][0-9]{5}$'` },
  { name: 'business_service_areas_type_fields_chk', table: 'business_service_areas', check: `("areaType" <> 'PINCODE' OR "pincode" IS NOT NULL) AND ("areaType" <> 'CITY' OR "city" IS NOT NULL) AND ("areaType" <> 'STATE' OR "state" IS NOT NULL) AND ("areaType" <> 'RADIUS' OR ("centerLatitude" IS NOT NULL AND "centerLongitude" IS NOT NULL AND "radiusKm" IS NOT NULL))` },
  { name: 'business_categories_no_self_parent_chk', table: 'business_categories', check: `"parentId" IS NULL OR "parentId" <> "id"` },
  { name: 'business_categories_radius_pos_chk', table: 'business_categories', check: `"defaultRadiusKm" IS NULL OR "defaultRadiusKm" > 0` },
  { name: 'business_category_stages_relevance_chk', table: 'business_category_stages', check: `"relevance" BETWEEN 1 AND 3` },
  { name: 'business_images_has_location_chk', table: 'business_images', check: `"url" IS NOT NULL OR "storageKey" IS NOT NULL` },
  // An image can only be APPROVED when licence or permission evidence is recorded.
  { name: 'business_images_approved_needs_evidence_chk', table: 'business_images', check: `"status" <> 'APPROVED' OR "licence" IS NOT NULL OR "permissionEvidence" IS NOT NULL` },
]

export function constraintStatement(c: DirectoryConstraint): string {
  return `ALTER TABLE "${c.table}" ADD CONSTRAINT "${c.name}" CHECK (${c.check})`
}

/** Adds any missing constraints. Safe to run repeatedly. Returns the names it added. */
export async function applyDirectoryConstraints(exec: SqlExecutor): Promise<string[]> {
  const existing = new Set(
    (await exec.all<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conname LIKE '%\\_chk' ESCAPE '\\'`)).map((r) => r.conname)
  )
  const added: string[] = []
  for (const c of DIRECTORY_CONSTRAINTS) {
    if (existing.has(c.name)) continue
    await exec.run(constraintStatement(c))
    added.push(c.name)
  }
  return added
}
