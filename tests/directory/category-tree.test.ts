import { describe, expect, it } from 'vitest'
import {
  annotateStageRelevance, buildCategoryTree, categoryDepth, searchCategories, sortByStageRelevance,
  subtreeHeight, validateReparent, wouldCreateCycle, type CategoryRecord,
} from '../../src/lib/directory/category-tree'

const c = (id: string, name: string, parentId: string | null = null, extra: Partial<CategoryRecord> = {}): CategoryRecord => ({
  id, slug: id, name, description: null, parentId, isActive: true, displayOrder: 0, synonyms: [], discoveryTerms: [], defaultRadiusKm: null, ...extra,
})

const flat: CategoryRecord[] = [
  c('g1', 'Electrical & Power', null, { displayOrder: 10 }),
  c('electrician', 'Electrician', 'g1', { displayOrder: 10, synonyms: ['wireman', 'electrical contractor'], discoveryTerms: ['electrician near me'] }),
  c('inverter', 'Inverter, UPS & Generator', 'g1', { displayOrder: 20, synonyms: ['power backup', 'dg set'] }),
  c('g2', 'Plumbing & Sanitation', null, { displayOrder: 20 }),
  c('plumber', 'Plumber', 'g2', { synonyms: ['pipe fitter'] }),
  c('old', 'Retired Trade', 'g2', { isActive: false, synonyms: ['retired'] }),
]

describe('buildCategoryTree', () => {
  it('nests children under parents and sorts by displayOrder then name', () => {
    const { roots, orphans } = buildCategoryTree(flat)
    expect(orphans).toEqual([])
    expect(roots.map((r) => r.id)).toEqual(['g1', 'g2'])
    expect(roots[0].children.map((x) => x.id)).toEqual(['electrician', 'inverter'])
  })
  it('reports orphans instead of dropping them', () => {
    const { roots, orphans } = buildCategoryTree([...flat, c('lost', 'Lost', 'missing')])
    expect(orphans.map((o) => o.id)).toEqual(['lost'])
    expect(JSON.stringify(roots)).not.toContain('"lost"')
  })
})

describe('hierarchy guards', () => {
  it('detects direct and indirect cycles', () => {
    expect(wouldCreateCycle(flat, 'g1', 'g1')).toBe(true)
    expect(wouldCreateCycle(flat, 'g1', 'electrician')).toBe(true)
    expect(wouldCreateCycle(flat, 'electrician', 'g2')).toBe(false)
    expect(wouldCreateCycle(flat, 'g1', null)).toBe(false)
  })
  it('measures depth and subtree height', () => {
    expect(categoryDepth(flat, 'g1')).toBe(1)
    expect(categoryDepth(flat, 'electrician')).toBe(2)
    expect(subtreeHeight(flat, 'g1')).toBe(2)
    expect(subtreeHeight(flat, 'plumber')).toBe(1)
  })
  it('limits the hierarchy to three levels and rejects unknown parents', () => {
    const three = [...flat, c('leaf3', 'Level three', 'electrician')]
    expect(validateReparent(three, null, 'leaf3')).toMatch(/limited to 3 levels/)
    expect(validateReparent(three, null, 'electrician')).toBeNull()
    expect(validateReparent(three, 'g2', 'electrician')).toMatch(/limited to 3 levels/) // g2 has children, would reach depth 4
    expect(validateReparent(flat, null, 'nope')).toMatch(/does not exist/)
    expect(validateReparent(flat, 'g1', 'electrician')).toMatch(/itself or its own descendant/)
  })
})

describe('searchCategories', () => {
  it('finds by name, synonym and discovery term, best match first', () => {
    expect(searchCategories(flat, 'electrician')[0].category.id).toBe('electrician')
    const syn = searchCategories(flat, 'wireman')
    expect(syn.map((h) => h.category.id)).toEqual(['electrician'])
    expect(syn[0].matchedOn).toBe('synonym')
    expect(searchCategories(flat, 'near me')[0].matchedOn).toBe('discoveryTerm')
  })
  it('ranks exact name above prefix above synonym', () => {
    const list = [
      c('a', 'Power', null, { synonyms: [] }),
      c('b', 'Power Tools', null),
      c('d', 'Backup', null, { synonyms: ['power'] }),
    ]
    expect(searchCategories(list, 'power').map((h) => h.category.id)).toEqual(['a', 'b', 'd'])
  })
  it('requires every query token to match and ignores case, punctuation and diacritics', () => {
    expect(searchCategories(flat, 'ELECTRICAL, contractor').map((h) => h.category.id)).toEqual(['electrician'])
    expect(searchCategories(flat, 'electrician plumbing')).toEqual([])
    expect(searchCategories([c('x', 'Café Décor')], 'cafe decor')).toHaveLength(1)
    expect(searchCategories(flat, '   ')).toEqual([])
  })
  it('hides inactive categories unless asked', () => {
    expect(searchCategories(flat, 'retired')).toEqual([])
    expect(searchCategories(flat, 'retired', { includeInactive: true })).toHaveLength(1)
  })
  it('honours the limit', () => {
    expect(searchCategories(flat, 'e', { limit: 1 })).toHaveLength(1)
  })
})

describe('stage relevance never hides categories', () => {
  const withStages = flat.map((x) => ({ ...x, stages: x.id === 'plumber' ? [{ stageId: 's-mep', relevance: 2 }] : [] }))
  it('annotates all categories and only reorders', () => {
    const annotated = annotateStageRelevance(withStages, 's-mep')
    expect(annotated).toHaveLength(flat.length)
    expect(annotated.find((x) => x.id === 'plumber')!.stageRelevance).toBe(2)
    const sorted = sortByStageRelevance(annotated)
    expect(sorted).toHaveLength(flat.length)
    expect(sorted[0].id).toBe('plumber')
  })
  it('keeps every category when the stage matches nothing or is absent', () => {
    expect(annotateStageRelevance(withStages, 'unknown-stage').every((x) => x.stageRelevance === 0)).toBe(true)
    expect(annotateStageRelevance(withStages, undefined)).toHaveLength(flat.length)
  })
})
