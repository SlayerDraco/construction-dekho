/**
 * Pure category logic: no database, no framework. Fully unit-tested.
 * The taxonomy is small and bounded (hundreds of rows), so ranking is done in memory.
 */

export const MAX_CATEGORY_DEPTH = 3

export interface CategoryRecord {
  id: string
  slug: string
  name: string
  description: string | null
  parentId: string | null
  isActive: boolean
  displayOrder: number
  synonyms: string[]
  discoveryTerms: string[]
  defaultRadiusKm: number | null
}

export type CategoryNode<T extends CategoryRecord = CategoryRecord> = T & { children: CategoryNode<T>[] }

const byOrder = (a: CategoryRecord, b: CategoryRecord) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)

/** Builds a forest. Records whose parent is missing are returned as `orphans` (never silently dropped). */
export function buildCategoryTree<T extends CategoryRecord>(flat: T[]): { roots: CategoryNode<T>[]; orphans: T[] } {
  const nodes = new Map<string, CategoryNode<T>>()
  for (const c of flat) nodes.set(c.id, { ...c, children: [] })
  const roots: CategoryNode<T>[] = []
  const orphans: T[] = []
  for (const node of nodes.values()) {
    if (!node.parentId) roots.push(node)
    else {
      const parent = nodes.get(node.parentId)
      if (parent) parent.children.push(node)
      else orphans.push(flat.find((f) => f.id === node.id)!)
    }
  }
  const sortRec = (list: CategoryNode<T>[]) => { list.sort(byOrder); list.forEach((n) => sortRec(n.children)) }
  sortRec(roots)
  return { roots, orphans }
}

export function categoryDepth(flat: Pick<CategoryRecord, 'id' | 'parentId'>[], id: string): number {
  const parentOf = new Map(flat.map((c) => [c.id, c.parentId]))
  let depth = 1
  let cur = parentOf.get(id) ?? null
  const seen = new Set<string>([id])
  while (cur) {
    if (seen.has(cur)) return Infinity
    seen.add(cur)
    depth++
    cur = parentOf.get(cur) ?? null
  }
  return depth
}

/** Highest number of levels in the subtree rooted at `id` (the node itself counts as 1). */
export function subtreeHeight(flat: Pick<CategoryRecord, 'id' | 'parentId'>[], id: string): number {
  const children = new Map<string, string[]>()
  for (const c of flat) if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id])
  const walk = (n: string, seen: Set<string>): number => {
    if (seen.has(n)) return Infinity
    const next = new Set(seen).add(n)
    return 1 + Math.max(0, ...(children.get(n) ?? []).map((k) => walk(k, next)))
  }
  return walk(id, new Set())
}

/** True when re-parenting `id` under `newParentId` would create a cycle. */
export function wouldCreateCycle(flat: Pick<CategoryRecord, 'id' | 'parentId'>[], id: string, newParentId: string | null): boolean {
  if (!newParentId) return false
  if (newParentId === id) return true
  const parentOf = new Map(flat.map((c) => [c.id, c.parentId]))
  let cur: string | null = newParentId
  const seen = new Set<string>()
  while (cur) {
    if (cur === id) return true
    if (seen.has(cur)) return true
    seen.add(cur)
    cur = parentOf.get(cur) ?? null
  }
  return false
}

/** Returns a human-readable reason if the proposed parent is invalid, otherwise null. */
export function validateReparent(flat: CategoryRecord[], id: string | null, newParentId: string | null): string | null {
  if (!newParentId) return null
  if (!flat.some((c) => c.id === newParentId)) return 'Parent category does not exist'
  if (id && wouldCreateCycle(flat, id, newParentId)) return 'A category cannot be placed under itself or its own descendant'
  const parentDepth = categoryDepth(flat, newParentId)
  const ownHeight = id ? subtreeHeight(flat, id) : 1
  if (parentDepth + ownHeight > MAX_CATEGORY_DEPTH) return `Category hierarchy is limited to ${MAX_CATEGORY_DEPTH} levels`
  return null
}

export interface CategorySearchHit<T extends CategoryRecord = CategoryRecord> {
  category: T
  score: number
  matchedOn: 'name' | 'synonym' | 'discoveryTerm'
}

const norm = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Ranks categories by name, synonym and discovery-term matches. Every query token must match somewhere.
 * Inactive categories are excluded unless `includeInactive` is set.
 */
export function searchCategories<T extends CategoryRecord>(
  flat: T[],
  query: string,
  opts: { includeInactive?: boolean; limit?: number } = {}
): CategorySearchHit<T>[] {
  const q = norm(query)
  if (!q) return []
  const tokens = q.split(' ')
  const hits: CategorySearchHit<T>[] = []

  for (const c of flat) {
    if (!c.isActive && !opts.includeInactive) continue
    const name = norm(c.name)
    const syns = c.synonyms.map(norm)
    const terms = c.discoveryTerms.map(norm)
    const haystack = [name, ...syns, ...terms].join(' | ')
    if (!tokens.every((t) => haystack.includes(t))) continue

    let score = 0
    let matchedOn: CategorySearchHit['matchedOn'] = 'discoveryTerm'
    const consider = (s: number, on: CategorySearchHit['matchedOn']) => { if (s > score) { score = s; matchedOn = on } }

    if (name === q) consider(100, 'name')
    else if (name.startsWith(q)) consider(85, 'name')
    else if (name.split(' ').some((w) => w.startsWith(q))) consider(65, 'name')
    else if (name.includes(q)) consider(45, 'name')

    for (const s of syns) {
      if (s === q) consider(75, 'synonym')
      else if (s.startsWith(q)) consider(55, 'synonym')
      else if (s.includes(q)) consider(35, 'synonym')
    }
    for (const t of terms) {
      if (t === q) consider(30, 'discoveryTerm')
      else if (t.includes(q)) consider(20, 'discoveryTerm')
    }
    // Multi-token queries matched across fields still qualify.
    if (score === 0) consider(10, 'name')
    hits.push({ category: c, score, matchedOn })
  }

  hits.sort((a, b) => b.score - a.score || byOrder(a.category, b.category))
  return opts.limit ? hits.slice(0, opts.limit) : hits
}

export interface StageRelevance { stageId: string; relevance: number }

/**
 * Adds a `stageRelevance` score (0 when unrelated) for ranking. It NEVER removes a category:
 * every category stays browseable regardless of the project's stage.
 */
export function annotateStageRelevance<T extends CategoryRecord & { stages?: StageRelevance[] }>(
  flat: T[],
  stageId: string | undefined
): (T & { stageRelevance: number })[] {
  return flat.map((c) => ({
    ...c,
    stageRelevance: stageId ? (c.stages?.find((s) => s.stageId === stageId)?.relevance ?? 0) : 0,
  }))
}

/** Stable sort: higher stage relevance first, then the normal display order. Does not filter. */
export function sortByStageRelevance<T extends CategoryRecord & { stageRelevance: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.stageRelevance - a.stageRelevance || byOrder(a, b))
}
