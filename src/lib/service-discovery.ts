import { prisma } from './prisma'

// Maps stages to relevant service categories
const STAGE_SERVICE_MAP: Record<string, string[]> = {
  'Planning': ['Architect', 'Structural Engineer', 'Surveyor'],
  'Site Preparation': ['Contractor', 'Excavation Contractor'],
  'Foundation': ['Contractor', 'Mason', 'Cement Supplier', 'Steel Supplier'],
  'Structure': ['Contractor', 'Mason', 'Steel Supplier'],
  'Walls & Masonry': ['Mason', 'Contractor'],
  'Utilities': ['Electrician', 'Plumber', 'Internet Installer'],
  'Surface Preparation': ['Mason', 'Waterproofing Contractor'],
  'Flooring & Finishes': ['Tile Supplier', 'Marble Supplier', 'Flooring Contractor'],
  'Painting': ['Painter'],
  'Fixtures & Installations': ['Electrician', 'Plumber', 'Carpenter'],
  'Kitchen': ['Modular Kitchen Provider', 'Carpenter'],
  'Exterior Development': ['Landscaping Contractor', 'Paver Contractor', 'Gate Fabricator'],
  'Security & Connectivity': ['CCTV Installer', 'Internet Installer', 'Smart Home Installer'],
  'Sustainability': ['Solar Installer', 'Electrician'],
  'Final Inspection': ['Contractor'],
  'Move-In Ready': [],
}

// Maps features to relevant service categories
const FEATURE_SERVICE_MAP: Record<string, string[]> = {
  'CCTV': ['CCTV Installer'],
  'Solar Panels': ['Solar Installer'],
  'Smart Lock': ['Smart Home Installer'],
  'Smart Lighting': ['Smart Home Installer', 'Electrician'],
  'Home Automation Hub': ['Smart Home Installer'],
  'Borewell': ['Borewell Contractor'],
  'Landscaping': ['Landscaping Contractor'],
  'Swimming Pool': ['Contractor'],
  'Lift': ['Elevator Installer'],
  'AC Preparation': ['AC Installer'],
  'EV Charger': ['Electrician'],
  'Battery Backup': ['Solar Installer', 'Electrician'],
}

export async function getRecommendedProviders(
  houseId: string,
  limit: number = 10
): Promise<Array<{
  id: string
  businessName: string
  description: string | null
  verified: boolean
  categories: string[]
  serviceAreas: string[]
  reviewCount: number
  hireAgainRate: number
}>> {
  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseStages: { include: { stage: true }, orderBy: { stage: { displayOrder: 'asc' } } },
      houseFeatures: { where: { enabled: true }, include: { feature: true } },
    },
  })

  if (!house) return []

  // Find current stage
  const currentStage = house.houseStages.find(
    (hs) => hs.status === 'IN_PROGRESS'
  ) ?? house.houseStages.find((hs) => hs.status === 'NOT_STARTED')

  const relevantCategories = new Set<string>()

  // Add stage-based categories
  if (currentStage) {
    const cats = STAGE_SERVICE_MAP[currentStage.stage.name] ?? []
    cats.forEach((c) => relevantCategories.add(c))
  }

  // Add feature-based categories
  for (const hf of house.houseFeatures) {
    const cats = FEATURE_SERVICE_MAP[hf.feature.name] ?? []
    cats.forEach((c) => relevantCategories.add(c))
  }

  if (relevantCategories.size === 0) return []

  // Find matching providers in the same city
  const providers = await prisma.serviceProvider.findMany({
    where: {
      active: true,
      categories: {
        some: {
          category: { name: { in: Array.from(relevantCategories) } },
        },
      },
      serviceAreas: {
        some: { city: house.city },
      },
    },
    include: {
      categories: { include: { category: true } },
      serviceAreas: true,
      reviews: true,
    },
    take: limit,
  })

  return providers.map((p) => {
    const totalReviews = p.reviews.length
    const hireAgainCount = p.reviews.filter((r) => r.wouldHireAgain).length
    return {
      id: p.id,
      businessName: p.businessName,
      description: p.description,
      verified: p.verified,
      categories: p.categories.map((c) => c.category.name),
      serviceAreas: p.serviceAreas.map((sa) => sa.city),
      reviewCount: totalReviews,
      hireAgainRate: totalReviews > 0 ? Math.round((hireAgainCount / totalReviews) * 100) : 0,
    }
  })
}

export async function searchProviders({
  query,
  city,
  category,
  page = 1,
  limit = 20,
}: {
  query?: string
  city?: string
  category?: string
  page?: number
  limit?: number
}) {
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { active: true }

  if (query) {
    where.OR = [
      { businessName: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }

  if (city) {
    where.serviceAreas = { some: { city: { contains: city, mode: 'insensitive' } } }
  }

  if (category) {
    where.categories = { some: { category: { name: { contains: category, mode: 'insensitive' } } } }
  }

  const [providers, total] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        serviceAreas: true,
        reviews: { select: { wouldHireAgain: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceProvider.count({ where }),
  ])

  return {
    providers: providers.map((p) => ({
      ...p,
      reviewCount: p.reviews.length,
      hireAgainRate:
        p.reviews.length > 0
          ? Math.round((p.reviews.filter((r) => r.wouldHireAgain).length / p.reviews.length) * 100)
          : 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }
}
