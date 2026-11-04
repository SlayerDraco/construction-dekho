import { describe, expect, it } from 'vitest'
import { EXTERNAL_SOURCE_KEYS, GROUP_COUNT, LEAF_COUNT, STAGE_KEYS, STAGE_KEY_TO_NAMES, TAXONOMY } from '../../src/lib/directory/taxonomy-data'
import { LEGACY_CATEGORY_NAME_TO_SLUG } from '../../src/lib/directory/legacy-category-map'
import { SLUG_REGEX } from '../../src/lib/directory/slug'

const leaves = TAXONOMY.flatMap((g) => g.children)

describe('taxonomy seed data', () => {
  it('has exactly the 18 agreed groups in order', () => {
    expect(GROUP_COUNT).toBe(18)
    expect(TAXONOMY.map((g) => g.name)).toEqual([
      'Planning, Architecture & Engineering', 'Land & Site Preparation', 'Foundation & Structural Work',
      'General Construction & Contracting', 'Roofing & Building Envelope', 'Doors, Windows & Glass',
      'Electrical & Power', 'Plumbing & Sanitation', 'Flooring & Surface Finishes', 'Plastering & Painting',
      'Interior Design & Furnishing', 'HVAC & Mechanical Systems', 'Smart Home & Security',
      'External Development & Landscaping', 'Building Materials & Retail', 'Energy, Water & Sustainability',
      'Cleaning, Maintenance & Repairs', 'Specialist Services',
    ])
  })

  it('gives every group several subcategories', () => {
    for (const g of TAXONOMY) expect(g.children.length, g.name).toBeGreaterThanOrEqual(5)
    expect(LEAF_COUNT).toBe(leaves.length)
  })

  it('uses unique, well-formed slugs across groups and subcategories', () => {
    const slugs = [...TAXONOMY.map((g) => g.slug), ...leaves.map((l) => l.slug)]
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s, s).toMatch(SLUG_REGEX)
  })

  it('uses unique names within the taxonomy', () => {
    const names = [...TAXONOMY.map((g) => g.name), ...leaves.map((l) => l.name)].map((n) => n.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('gives every subcategory at least one discovery term and lowercase, unique synonyms', () => {
    for (const l of leaves) {
      expect(l.discoveryTerms.length, l.slug).toBeGreaterThan(0)
      expect(new Set(l.synonyms).size, l.slug).toBe(l.synonyms.length)
      for (const s of l.synonyms) expect(s, `${l.slug}:${s}`).toBe(s.toLowerCase())
    }
  })

  it('only references known stage keys and never lists a stage as both primary and secondary', () => {
    for (const l of leaves) {
      for (const k of [...l.stages, ...l.stagesSecondary]) expect(STAGE_KEYS as readonly string[], l.slug).toContain(k)
      expect(l.stages.filter((k) => l.stagesSecondary.includes(k)), l.slug).toEqual([])
    }
    for (const k of STAGE_KEYS) expect(STAGE_KEY_TO_NAMES[k].length).toBeGreaterThan(0)
  })

  it('maps categories to stages many-to-many (a category can serve several stages)', () => {
    expect(leaves.filter((l) => l.stages.length + l.stagesSecondary.length > 1).length).toBeGreaterThan(20)
  })

  it('formats external mappings as proposals for known sources only', () => {
    expect(EXTERNAL_SOURCE_KEYS).toEqual(['google_places', 'osm'])
    for (const l of leaves) for (const o of l.osm) expect(o, l.slug).toMatch(/^[a-z_]+=[a-z_]+$/)
    for (const l of leaves) for (const g of l.googlePlaces) expect(g, l.slug).toMatch(/^[a-z_]+$/)
  })

  it('every legacy category mapping points at an existing taxonomy slug', () => {
    const slugs = new Set(leaves.map((l) => l.slug))
    for (const [name, slug] of Object.entries(LEGACY_CATEGORY_NAME_TO_SLUG)) {
      expect(name, name).toBe(name.toLowerCase())
      expect(slugs.has(slug), `${name} -> ${slug}`).toBe(true)
    }
  })

  it('covers every category name used by the existing recommendation code', () => {
    const used = ['Architect','Structural Engineer','Surveyor','Contractor','Excavation Contractor','Mason','Cement Supplier','Steel Supplier','Electrician','Plumber','Internet Installer','Waterproofing Contractor','Tile Supplier','Marble Supplier','Flooring Contractor','Painter','Carpenter','Modular Kitchen Provider','Landscaping Contractor','Paver Contractor','Gate Fabricator','CCTV Installer','Smart Home Installer','Solar Installer','Borewell Contractor','Elevator Installer','AC Installer']
    for (const n of used) expect(LEGACY_CATEGORY_NAME_TO_SLUG[n.toLowerCase()], n).toBeTruthy()
  })
})
