import { SQL_NOW, type SqlExecutor } from './sql-executor'
import { STAGE_KEY_TO_NAMES, TAXONOMY, type StageKey } from './taxonomy-data'

export interface TaxonomySeedReport {
  groupsCreated: number
  categoriesCreated: number
  stageMappingsCreated: number
  externalMappingsCreated: number
}

/**
 * Idempotent taxonomy seed.
 *
 * - Categories are created only when their slug does not exist. Existing rows are NEVER overwritten, so
 *   administrator edits (names, synonyms, active flag, ordering, parent) survive re-seeding.
 * - Stage and external mappings are insert-missing. A seeded mapping an administrator deleted will return
 *   on the next seed; deactivate the category instead of deleting seeded mappings.
 * - Stage names that do not exist in the target database are skipped silently (two naming schemes exist in the repo).
 */
export async function seedTaxonomy(exec: SqlExecutor): Promise<TaxonomySeedReport> {
  const groupRows = TAXONOMY.map((g, i) => ({
    slug: g.slug, name: g.name, description: g.description, ord: (i + 1) * 10, syn: [], terms: [],
  }))
  const groups = await exec.all(
    `INSERT INTO "business_categories"
       ("id","slug","name","description","parentId","isActive","displayOrder","synonyms","discoveryTerms","createdAt","updatedAt")
     SELECT gen_random_uuid()::text, m.slug, m.name, m.description, NULL, true, m.ord,
            ARRAY(SELECT jsonb_array_elements_text(m.syn)), ARRAY(SELECT jsonb_array_elements_text(m.terms)), ${SQL_NOW}, ${SQL_NOW}
     FROM jsonb_to_recordset($1::jsonb) AS m(slug text, name text, description text, ord int, syn jsonb, terms jsonb)
     ON CONFLICT ("slug") DO NOTHING
     RETURNING "slug"`,
    [JSON.stringify(groupRows)]
  )

  const leafRows = TAXONOMY.flatMap((g) =>
    g.children.map((c, i) => ({
      slug: c.slug, name: c.name, description: c.description ?? null, parent: g.slug, ord: (i + 1) * 10,
      syn: c.synonyms, terms: c.discoveryTerms,
    }))
  )
  const leaves = await exec.all(
    `INSERT INTO "business_categories"
       ("id","slug","name","description","parentId","isActive","displayOrder","synonyms","discoveryTerms","createdAt","updatedAt")
     SELECT gen_random_uuid()::text, m.slug, m.name, m.description, p."id", true, m.ord,
            ARRAY(SELECT jsonb_array_elements_text(m.syn)), ARRAY(SELECT jsonb_array_elements_text(m.terms)), ${SQL_NOW}, ${SQL_NOW}
     FROM jsonb_to_recordset($1::jsonb) AS m(slug text, name text, description text, parent text, ord int, syn jsonb, terms jsonb)
     JOIN "business_categories" p ON p."slug" = m.parent
     ON CONFLICT ("slug") DO NOTHING
     RETURNING "slug"`,
    [JSON.stringify(leafRows)]
  )

  const stageRows: { slug: string; stage: string; rel: number }[] = []
  const add = (slug: string, keys: StageKey[], rel: number) => {
    for (const k of keys) for (const stage of STAGE_KEY_TO_NAMES[k]) stageRows.push({ slug, stage, rel })
  }
  for (const g of TAXONOMY) for (const c of g.children) { add(c.slug, c.stages, 2); add(c.slug, c.stagesSecondary, 1) }
  const stageMappings = await exec.all(
    `INSERT INTO "business_category_stages" ("id","categoryId","stageId","relevance")
     SELECT gen_random_uuid()::text, c."id", s."id", max(m.rel)
     FROM jsonb_to_recordset($1::jsonb) AS m(slug text, stage text, rel int)
     JOIN "business_categories" c ON c."slug" = m.slug
     JOIN "stages" s ON s."name" = m.stage
     GROUP BY c."id", s."id"
     ON CONFLICT ("categoryId","stageId") DO NOTHING
     RETURNING "id"`,
    [JSON.stringify(stageRows)]
  )

  const extRows: { slug: string; source: string; code: string }[] = []
  for (const g of TAXONOMY) for (const c of g.children) {
    for (const code of c.googlePlaces) extRows.push({ slug: c.slug, source: 'google_places', code })
    for (const code of c.osm) extRows.push({ slug: c.slug, source: 'osm', code })
  }
  const externalMappings = await exec.all(
    `INSERT INTO "business_category_external_mappings" ("id","categoryId","sourceKey","externalCode")
     SELECT gen_random_uuid()::text, c."id", m.source, m.code
     FROM jsonb_to_recordset($1::jsonb) AS m(slug text, source text, code text)
     JOIN "business_categories" c ON c."slug" = m.slug
     ON CONFLICT ("categoryId","sourceKey","externalCode") DO NOTHING
     RETURNING "id"`,
    [JSON.stringify(extRows)]
  )

  return {
    groupsCreated: groups.length,
    categoriesCreated: leaves.length,
    stageMappingsCreated: stageMappings.length,
    externalMappingsCreated: externalMappings.length,
  }
}
