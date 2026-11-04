import { describe, expect, it } from 'vitest'
import { slugify, SLUG_REGEX } from '../../src/lib/directory/slug'
import {
  categoryCreateSchema, categoryQuerySchema, categoryUpdateSchema, listingCreateSchema, locationInputSchema,
  pincodeSchema, serviceAreaInputSchema,
} from '../../src/lib/directory/validation'

const uuid = '3f2b8a52-6f0e-4d3a-9d1e-0a1b2c3d4e5f'

describe('slugify', () => {
  it('produces safe ascii slugs', () => {
    expect(slugify('Plumbing & Sanitation')).toBe('plumbing-and-sanitation')
    expect(slugify('  Café   Décor!! ')).toBe('cafe-decor')
    expect(slugify('---')).toBe('')
    expect(slugify('ब्रिक')).toBe('')
    expect(SLUG_REGEX.test(slugify('A'.repeat(200), 40))).toBe(true)
    expect(slugify('A'.repeat(200), 40).length).toBeLessThanOrEqual(40)
  })
  it('never leaves a trailing hyphen after truncation', () => {
    expect(slugify('abcd-efgh', 5)).toBe('abcd')
  })
})

describe('pincode and coordinates', () => {
  it('accepts valid Indian PIN codes only', () => {
    expect(pincodeSchema.safeParse('141001').success).toBe(true)
    for (const bad of ['014001', '14100', '1410011', 'abcdef', '']) expect(pincodeSchema.safeParse(bad).success, bad).toBe(false)
  })
  it('requires coordinates as a pair and within range', () => {
    expect(locationInputSchema.safeParse({ latitude: 30.9, longitude: 75.85 }).success).toBe(true)
    expect(locationInputSchema.safeParse({ latitude: 30.9 }).success).toBe(false)
    expect(locationInputSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false)
    expect(locationInputSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false)
  })
})

describe('service areas', () => {
  it('requires the fields each type needs', () => {
    expect(serviceAreaInputSchema.safeParse({ areaType: 'PINCODE' }).success).toBe(false)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'PINCODE', pincode: '141001' }).success).toBe(true)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'CITY' }).success).toBe(false)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'STATE', state: 'Punjab' }).success).toBe(true)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'RADIUS', centerLatitude: 30.9, centerLongitude: 75.8 }).success).toBe(false)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'RADIUS', centerLatitude: 30.9, centerLongitude: 75.8, radiusKm: 50 }).success).toBe(true)
    expect(serviceAreaInputSchema.safeParse({ areaType: 'NATIONWIDE' }).success).toBe(true)
  })
})

describe('category schemas', () => {
  it('normalises synonyms and applies defaults', () => {
    const r = categoryCreateSchema.parse({ name: ' Electrician ', synonyms: ['Wireman', 'wireman', ' WIREMAN '] })
    expect(r.name).toBe('Electrician')
    expect(r.synonyms).toEqual(['wireman'])
    expect(r.isActive).toBe(true)
    expect(r.stages).toEqual([])
  })
  it('rejects bad slugs, radii, sources and stage relevance', () => {
    expect(categoryCreateSchema.safeParse({ name: 'x', slug: 'Bad Slug' }).success).toBe(false)
    expect(categoryCreateSchema.safeParse({ name: 'x', defaultRadiusKm: 0 }).success).toBe(false)
    expect(categoryCreateSchema.safeParse({ name: 'x', externalMappings: [{ sourceKey: 'yelp', externalCode: 'a' }] }).success).toBe(false)
    expect(categoryCreateSchema.safeParse({ name: 'x', stages: [{ stageId: uuid, relevance: 4 }] }).success).toBe(false)
    expect(categoryCreateSchema.safeParse({ name: 'x', stages: [{ stageId: uuid, relevance: 2 }], externalMappings: [{ sourceKey: 'osm', externalCode: 'craft=plumber' }] }).success).toBe(true)
  })
  it('requires at least one real field to update', () => {
    expect(categoryUpdateSchema.safeParse({}).success).toBe(false)
    expect(categoryUpdateSchema.safeParse({ reason: 'only a reason' }).success).toBe(false)
    expect(categoryUpdateSchema.safeParse({ isActive: false }).success).toBe(true)
  })
  it('PATCH never injects defaults: only the fields sent are returned', () => {
    // Regression: a partial() of the create schema used to fill isActive/displayOrder/synonyms/stages with defaults,
    // which would silently reactivate a category and wipe its synonyms and stage mappings.
    expect(categoryUpdateSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' })
    expect(categoryUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false })
    expect(categoryUpdateSchema.parse({ synonyms: ['A', 'a'] })).toEqual({ synonyms: ['a'] })
  })
  it('bounds the query: pagination and booleans', () => {
    const q = categoryQuerySchema.parse({})
    expect(q).toMatchObject({ view: 'tree', page: 1, limit: 100, includeStages: false, includeInactive: false })
    expect(categoryQuerySchema.safeParse({ limit: '1000' }).success).toBe(false)
    expect(categoryQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    expect(categoryQuerySchema.parse({ includeStages: 'true' }).includeStages).toBe(true)
    expect(categoryQuerySchema.safeParse({ stageId: 'nope' }).success).toBe(false)
  })
})

describe('listing schema (a listing needs no user)', () => {
  it('has no user field and keeps location separate from service areas', () => {
    const r = listingCreateSchema.parse({
      name: 'Sample Electricals', categoryIds: [uuid],
      locations: [{ city: 'Ludhiana', pincode: '141001', latitude: 30.9, longitude: 75.85 }],
      serviceAreas: [{ areaType: 'CITY', city: 'Ludhiana' }, { areaType: 'PINCODE', pincode: '141002' }],
    })
    expect(r.locations).toHaveLength(1)
    expect(r.serviceAreas).toHaveLength(2)
    expect('userId' in r).toBe(false)
  })
  it('requires a category and a consistent primary category', () => {
    expect(listingCreateSchema.safeParse({ name: 'x', categoryIds: [] }).success).toBe(false)
    expect(listingCreateSchema.safeParse({ name: 'x', categoryIds: [uuid], primaryCategoryId: '4f2b8a52-6f0e-4d3a-9d1e-0a1b2c3d4e5f' }).success).toBe(false)
  })
})
