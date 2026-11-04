import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { writeBusinessAudit } from './business-audit'
import {
  annotateStageRelevance, buildCategoryTree, searchCategories, sortByStageRelevance, validateReparent,
  type CategoryNode, type CategoryRecord,
} from './category-tree'
import { DirectoryError } from './errors'
import { slugify } from './slug'
import type { CategoryCreateInput, CategoryQuery, CategoryUpdateInput } from './validation'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const HARD_CAP = 2000 // the taxonomy is small by design; this only guards against runaway data

const detailInclude = {
  stageMappings: { include: { stage: { select: { id: true, name: true } } } },
  externalMappings: true,
  _count: { select: { listings: true, children: true } },
} satisfies Prisma.BusinessCategoryInclude

type Row = Prisma.BusinessCategoryGetPayload<{ include: typeof detailInclude }>

export interface CategoryView extends CategoryRecord {
  stages: { stageId: string; stageName: string; relevance: number }[]
  externalMappings: { sourceKey: string; externalCode: string; externalLabel: string | null }[]
  listingCount: number
  childCount: number
}

function toView(r: Row): CategoryView {
  return {
    id: r.id, slug: r.slug, name: r.name, description: r.description, parentId: r.parentId, isActive: r.isActive,
    displayOrder: r.displayOrder, synonyms: r.synonyms, discoveryTerms: r.discoveryTerms, defaultRadiusKm: r.defaultRadiusKm,
    stages: r.stageMappings.map((m) => ({ stageId: m.stageId, stageName: m.stage.name, relevance: m.relevance })),
    externalMappings: r.externalMappings.map((m) => ({ sourceKey: m.sourceKey, externalCode: m.externalCode, externalLabel: m.externalLabel })),
    listingCount: r._count.listings,
    childCount: r._count.children,
  }
}

async function loadAll(includeInactive: boolean): Promise<CategoryView[]> {
  const rows = await prisma.businessCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: detailInclude,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    take: HARD_CAP,
  })
  return rows.map(toView)
}

/** Public shape: heavy fields only when requested. */
function shape(c: CategoryView & { stageRelevance?: number }, includeStages: boolean) {
  const { stages, externalMappings: _omitted, ...rest } = c
  void _omitted
  return includeStages ? { ...rest, stages } : rest
}

export async function getCategoryTree(opts: { includeInactive: boolean; includeStages: boolean; stageId?: string }) {
  const all = await loadAll(opts.includeInactive)
  const annotated = annotateStageRelevance(all.map((c) => ({ ...c, stages: c.stages })), opts.stageId)
  const { roots, orphans } = buildCategoryTree(annotated)
  const strip = (n: CategoryNode<(typeof annotated)[number]>): unknown => ({
    ...shape(n, opts.includeStages), stageRelevance: n.stageRelevance, children: n.children.map(strip),
  })
  return { categories: roots.map(strip), orphanCount: orphans.length }
}

export async function listCategories(query: CategoryQuery, opts: { isAdmin: boolean }) {
  const includeInactive = query.includeInactive && opts.isAdmin
  let list: (CategoryView & { stageRelevance?: number; match?: { score: number; matchedOn: string } })[] = await loadAll(includeInactive)

  if (query.parentId) list = list.filter((c) => c.parentId === query.parentId)

  if (query.q) {
    const hits = searchCategories(list, query.q, { includeInactive })
    list = hits.map((h) => ({ ...h.category, match: { score: h.score, matchedOn: h.matchedOn } }))
  }
  if (query.stageId) {
    // Ranking only: annotate and reorder, never filter.
    const annotated = annotateStageRelevance(list, query.stageId)
    list = query.q ? annotated : sortByStageRelevance(annotated)
  }

  const total = list.length
  const start = (query.page - 1) * query.limit
  return {
    categories: list.slice(start, start + query.limit).map((c) => ({ ...shape(c, query.includeStages), stageRelevance: c.stageRelevance, match: c.match })),
    total, page: query.page, totalPages: Math.max(1, Math.ceil(total / query.limit)),
  }
}

export async function getCategory(idOrSlug: string, opts: { isAdmin: boolean }) {
  const row = await prisma.businessCategory.findUnique({
    where: UUID.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    include: detailInclude,
  })
  if (!row || (!row.isActive && !opts.isAdmin)) throw new DirectoryError(404, 'Category not found', 'NOT_FOUND')
  return toView(row)
}

async function assertStagesExist(tx: Prisma.TransactionClient, stageIds: string[]) {
  const unique = Array.from(new Set(stageIds))
  if (!unique.length) return
  const found = await tx.stage.count({ where: { id: { in: unique } } })
  if (found !== unique.length) throw new DirectoryError(400, 'One or more stageId values do not exist', 'INVALID_STAGE')
}

async function uniqueSlug(tx: Prisma.TransactionClient, base: string): Promise<string> {
  const root = base || 'category'
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    if (!(await tx.businessCategory.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate
  }
  throw new DirectoryError(409, 'Could not generate a unique slug', 'SLUG_CONFLICT')
}

function snapshot(c: { slug: string; name: string; description: string | null; parentId: string | null; isActive: boolean; displayOrder: number; synonyms: string[]; discoveryTerms: string[]; defaultRadiusKm: number | null }) {
  return { slug: c.slug, name: c.name, description: c.description, parentId: c.parentId, isActive: c.isActive, displayOrder: c.displayOrder, synonyms: c.synonyms, discoveryTerms: c.discoveryTerms, defaultRadiusKm: c.defaultRadiusKm }
}

export async function createCategory(input: CategoryCreateInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const flat = (await tx.businessCategory.findMany({ select: { id: true, parentId: true, slug: true, name: true, description: true, isActive: true, displayOrder: true, synonyms: true, discoveryTerms: true, defaultRadiusKm: true }, take: HARD_CAP }))
    const parentError = validateReparent(flat as CategoryRecord[], null, input.parentId ?? null)
    if (parentError) throw new DirectoryError(400, parentError, 'INVALID_PARENT')
    await assertStagesExist(tx, input.stages.map((s) => s.stageId))

    let slug = input.slug
    if (slug) {
      if (await tx.businessCategory.findUnique({ where: { slug }, select: { id: true } })) throw new DirectoryError(409, 'Slug already exists', 'SLUG_CONFLICT')
    } else slug = await uniqueSlug(tx, slugify(input.name))

    const created = await tx.businessCategory.create({
      data: {
        slug, name: input.name, description: input.description, parentId: input.parentId ?? null,
        isActive: input.isActive, displayOrder: input.displayOrder, synonyms: input.synonyms, discoveryTerms: input.discoveryTerms,
        defaultRadiusKm: input.defaultRadiusKm ?? null,
        stageMappings: { create: input.stages.map((s) => ({ stageId: s.stageId, relevance: s.relevance })) },
        externalMappings: { create: input.externalMappings.map((m) => ({ sourceKey: m.sourceKey, externalCode: m.externalCode, externalLabel: m.externalLabel })) },
      },
      include: detailInclude,
    })
    await writeBusinessAudit(tx, { actorId, action: 'CATEGORY_CREATED', entityType: 'BusinessCategory', entityId: created.id, after: snapshot(created), reason: input.reason })
    return toView(created)
  }, { timeout: 20_000 })
}

export async function updateCategory(id: string, input: CategoryUpdateInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.businessCategory.findUnique({ where: { id } })
    if (!existing) throw new DirectoryError(404, 'Category not found', 'NOT_FOUND')

    const flat = await tx.businessCategory.findMany({ select: { id: true, parentId: true, slug: true, name: true, description: true, isActive: true, displayOrder: true, synonyms: true, discoveryTerms: true, defaultRadiusKm: true }, take: HARD_CAP }) as CategoryRecord[]
    const data: Prisma.BusinessCategoryUncheckedUpdateInput = {}
    if (input.name !== undefined) data.name = input.name
    if (input.description !== undefined) data.description = input.description
    if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder
    if (input.synonyms !== undefined) data.synonyms = input.synonyms
    if (input.discoveryTerms !== undefined) data.discoveryTerms = input.discoveryTerms
    if (input.defaultRadiusKm !== undefined) data.defaultRadiusKm = input.defaultRadiusKm
    if (input.slug !== undefined && input.slug !== existing.slug) {
      if (await tx.businessCategory.findUnique({ where: { slug: input.slug }, select: { id: true } })) throw new DirectoryError(409, 'Slug already exists', 'SLUG_CONFLICT')
      data.slug = input.slug
    }
    if (input.parentId !== undefined && input.parentId !== existing.parentId) {
      const err = validateReparent(flat, id, input.parentId)
      if (err) throw new DirectoryError(400, err, 'INVALID_PARENT')
      data.parentId = input.parentId
    }

    // Deactivating a category also deactivates its descendants so none is left hidden under an inactive parent.
    let cascaded: string[] = []
    const activeChanged = input.isActive !== undefined && input.isActive !== existing.isActive
    if (activeChanged) {
      data.isActive = input.isActive
      if (input.isActive === false) {
        const queue = [id]
        while (queue.length) {
          const cur = queue.pop()!
          for (const c of flat) if (c.parentId === cur && c.isActive) { cascaded.push(c.id); queue.push(c.id) }
        }
        if (cascaded.length) await tx.businessCategory.updateMany({ where: { id: { in: cascaded } }, data: { isActive: false } })
      }
    }

    const updated = Object.keys(data).length ? await tx.businessCategory.update({ where: { id }, data }) : existing
    const before = snapshot(existing)
    const after = snapshot(updated)

    if (activeChanged) {
      await writeBusinessAudit(tx, {
        actorId, action: input.isActive ? 'CATEGORY_REACTIVATED' : 'CATEGORY_DEACTIVATED', entityType: 'BusinessCategory', entityId: id,
        before, after: { ...after, cascadedDeactivations: cascaded }, reason: input.reason,
      })
      cascaded = []
    }
    const otherChanges = Object.keys(data).filter((k) => k !== 'isActive')
    if (otherChanges.length) await writeBusinessAudit(tx, { actorId, action: 'CATEGORY_UPDATED', entityType: 'BusinessCategory', entityId: id, before, after, reason: input.reason })

    if (input.stages !== undefined) {
      await assertStagesExist(tx, input.stages.map((s) => s.stageId))
      const prev = await tx.businessCategoryStage.findMany({ where: { categoryId: id }, select: { stageId: true, relevance: true } })
      await tx.businessCategoryStage.deleteMany({ where: { categoryId: id } })
      if (input.stages.length) await tx.businessCategoryStage.createMany({ data: input.stages.map((s) => ({ categoryId: id, stageId: s.stageId, relevance: s.relevance })), skipDuplicates: true })
      await writeBusinessAudit(tx, { actorId, action: 'CATEGORY_STAGES_CHANGED', entityType: 'BusinessCategory', entityId: id, before: { stages: prev }, after: { stages: input.stages }, reason: input.reason })
    }
    if (input.externalMappings !== undefined) {
      const prev = await tx.businessCategoryExternalMapping.findMany({ where: { categoryId: id }, select: { sourceKey: true, externalCode: true, externalLabel: true } })
      await tx.businessCategoryExternalMapping.deleteMany({ where: { categoryId: id } })
      if (input.externalMappings.length) await tx.businessCategoryExternalMapping.createMany({ data: input.externalMappings.map((m) => ({ categoryId: id, sourceKey: m.sourceKey, externalCode: m.externalCode, externalLabel: m.externalLabel })), skipDuplicates: true })
      await writeBusinessAudit(tx, { actorId, action: 'CATEGORY_MAPPINGS_CHANGED', entityType: 'BusinessCategory', entityId: id, before: { mappings: prev }, after: { mappings: input.externalMappings }, reason: input.reason })
    }

    return toView((await tx.businessCategory.findUniqueOrThrow({ where: { id }, include: detailInclude })))
  }, { timeout: 20_000 })
}

/** Hard delete is allowed only for an unused category. Otherwise deactivate it. */
export async function deleteCategory(id: string, actorId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.businessCategory.findUnique({ where: { id }, include: { _count: { select: { children: true, listings: true, legacyMaps: true } } } })
    if (!row) throw new DirectoryError(404, 'Category not found', 'NOT_FOUND')
    if (row._count.children || row._count.listings || row._count.legacyMaps) {
      throw new DirectoryError(409, 'Category is in use (children, listings or legacy mappings). Deactivate it instead.', 'CATEGORY_IN_USE')
    }
    await tx.businessCategory.delete({ where: { id } })
    await writeBusinessAudit(tx, { actorId, action: 'CATEGORY_DELETED', entityType: 'BusinessCategory', entityId: id, before: snapshot(row), reason })
    return { deleted: true }
  }, { timeout: 20_000 })
}
