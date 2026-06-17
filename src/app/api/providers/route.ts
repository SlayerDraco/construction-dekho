import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { searchProviders } from '@/lib/service-discovery'

const createProviderSchema = z.object({
  businessName: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  categoryIds: z.array(z.string().uuid()).min(1).max(10),
  serviceAreas: z.array(
    z.object({
      city: z.string().min(2).max(100),
      radius: z.number().positive().max(500).default(50),
    })
  ).min(1).max(20),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') ?? undefined
  const city = searchParams.get('city') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const result = await searchProviders({ query, city, category, page, limit })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createProviderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  // Check if user already has a provider profile
  const existing = await prisma.serviceProvider.findUnique({ where: { userId: user!.id } })
  if (existing) {
    return NextResponse.json({ error: 'You already have a service provider profile' }, { status: 409 })
  }

  const provider = await prisma.serviceProvider.create({
    data: {
      userId: user!.id,
      businessName: parsed.data.businessName,
      description: parsed.data.description,
      categories: {
        createMany: {
          data: parsed.data.categoryIds.map((cid) => ({ categoryId: cid })),
          skipDuplicates: true,
        },
      },
      serviceAreas: {
        createMany: {
          data: parsed.data.serviceAreas,
          skipDuplicates: true,
        },
      },
    },
    include: {
      categories: { include: { category: true } },
      serviceAreas: true,
    },
  })

  return NextResponse.json(provider, { status: 201 })
}
