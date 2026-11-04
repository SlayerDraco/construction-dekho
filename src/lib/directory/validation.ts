import { z } from 'zod'
import { SLUG_REGEX } from './slug'

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/
export const EXTERNAL_SOURCE_KEYS = ['google_places', 'osm'] as const
export const DEFAULT_DISCOVERY_RADIUS_KM = 50

const trimmed = (max: number) => z.string().trim().min(1).max(max)
const stringList = (maxItems: number, maxLen: number) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems)
    .transform((list) => Array.from(new Set(list.map((s) => s.toLowerCase()))))

export const slugSchema = z.string().trim().min(2).max(80).regex(SLUG_REGEX, 'Use lowercase letters, numbers and single hyphens')
export const pincodeSchema = z.string().trim().regex(PINCODE_REGEX, 'PIN code must be 6 digits and not start with 0')
export const latitudeSchema = z.number().min(-90).max(90)
export const longitudeSchema = z.number().min(-180).max(180)

// ---------- Categories ----------

export const categoryStageInputSchema = z.object({
  stageId: z.string().uuid(),
  relevance: z.number().int().min(1).max(3).default(1),
})

export const categoryExternalMappingInputSchema = z.object({
  sourceKey: z.enum(EXTERNAL_SOURCE_KEYS),
  externalCode: trimmed(120),
  externalLabel: z.string().trim().max(160).optional(),
})

// Field definitions WITHOUT defaults. Update (PATCH) must only touch fields that were actually sent,
// so defaults live exclusively on the create schema.
const categoryFields = z.object({
  name: trimmed(120),
  slug: slugSchema,
  description: z.string().trim().max(1000),
  parentId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(100000),
  synonyms: stringList(50, 80),
  discoveryTerms: stringList(30, 120),
  defaultRadiusKm: z.number().int().min(1).max(500).nullable(),
  stages: z.array(categoryStageInputSchema).max(30),
  externalMappings: z.array(categoryExternalMappingInputSchema).max(50),
  reason: z.string().trim().max(500),
})

export const categoryCreateSchema = z.object({
  name: categoryFields.shape.name,
  slug: categoryFields.shape.slug.optional(),
  description: categoryFields.shape.description.optional(),
  parentId: categoryFields.shape.parentId.optional(),
  isActive: categoryFields.shape.isActive.default(true),
  displayOrder: categoryFields.shape.displayOrder.default(0),
  synonyms: categoryFields.shape.synonyms.default([]),
  discoveryTerms: categoryFields.shape.discoveryTerms.default([]),
  defaultRadiusKm: categoryFields.shape.defaultRadiusKm.optional(),
  stages: categoryFields.shape.stages.default([]),
  externalMappings: categoryFields.shape.externalMappings.default([]),
  reason: categoryFields.shape.reason.optional(),
})

export const categoryUpdateSchema = categoryFields.partial().refine(
  (v) => Object.keys(v).filter((k) => k !== 'reason').length > 0,
  { message: 'Provide at least one field to update' }
)

export const categoryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  view: z.enum(['tree', 'flat']).default('tree'),
  parentId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  includeStages: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  includeInactive: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

// ---------- Business listing building blocks (used by later phases; defined now so the shapes are fixed) ----------

export const locationInputSchema = z.object({
  label: z.string().trim().max(120).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  locality: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  pincode: pincodeSchema.optional(),
  country: z.string().trim().length(2).default('IN'),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  isPrimary: z.boolean().default(true),
}).refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
  message: 'latitude and longitude must be provided together',
})

export const serviceAreaInputSchema = z.object({
  areaType: z.enum(['PINCODE', 'LOCALITY', 'CITY', 'DISTRICT', 'STATE', 'RADIUS', 'NATIONWIDE']),
  pincode: pincodeSchema.optional(),
  locality: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  centerLatitude: latitudeSchema.optional(),
  centerLongitude: longitudeSchema.optional(),
  radiusKm: z.number().positive().max(2000).optional(),
}).superRefine((v, ctx) => {
  const need = (cond: boolean, path: string, message: string) => { if (!cond) ctx.addIssue({ code: 'custom', path: [path], message }) }
  if (v.areaType === 'PINCODE') need(!!v.pincode, 'pincode', 'pincode is required for a PINCODE area')
  if (v.areaType === 'CITY') need(!!v.city, 'city', 'city is required for a CITY area')
  if (v.areaType === 'STATE') need(!!v.state, 'state', 'state is required for a STATE area')
  if (v.areaType === 'RADIUS') {
    need(v.centerLatitude !== undefined, 'centerLatitude', 'centerLatitude is required for a RADIUS area')
    need(v.centerLongitude !== undefined, 'centerLongitude', 'centerLongitude is required for a RADIUS area')
    need(v.radiusKm !== undefined, 'radiusKm', 'radiusKm is required for a RADIUS area')
  }
})

export const listingCreateSchema = z.object({
  name: trimmed(200),
  description: z.string().trim().max(2000).optional(),
  categoryIds: z.array(z.string().uuid()).min(1).max(15),
  primaryCategoryId: z.string().uuid().optional(),
  website: z.string().trim().url().max(300).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(200).optional(),
  locations: z.array(locationInputSchema).max(10).default([]),
  serviceAreas: z.array(serviceAreaInputSchema).max(50).default([]),
}).refine((v) => !v.primaryCategoryId || v.categoryIds.includes(v.primaryCategoryId), {
  message: 'primaryCategoryId must be one of categoryIds',
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
export type CategoryQuery = z.infer<typeof categoryQuerySchema>
export type ListingCreateInput = z.infer<typeof listingCreateSchema>
