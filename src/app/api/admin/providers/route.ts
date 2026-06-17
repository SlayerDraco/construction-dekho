import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const createProviderAdminSchema = z.object({
  businessName: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  categoryIds: z.array(z.string().uuid()).min(1),
  serviceAreas: z.array(z.object({ city: z.string(), radius: z.number().default(50) })).min(1),
  verified: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') ?? ''
  const verified = searchParams.get('verified')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (query) where.businessName = { contains: query, mode: 'insensitive' }
  if (verified !== null && verified !== '') where.verified = verified === 'true'

  const [providers, total] = await Promise.all([
    prisma.serviceProvider.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        categories: { include: { category: true } },
        serviceAreas: true,
        _count: { select: { reviews: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceProvider.count({ where }),
  ])

  return NextResponse.json({ providers, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createProviderAdminSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  // Create a placeholder user for the provider
  const placeholderUser = await prisma.user.create({
    data: {
      clerkId: `admin-created-${Date.now()}`,
      fullName: parsed.data.businessName,
      email: `provider-${Date.now()}@hcos.placeholder`,
      role: 'SERVICE_PROVIDER',
    },
  })

  const provider = await prisma.serviceProvider.create({
    data: {
      userId: placeholderUser.id,
      businessName: parsed.data.businessName,
      description: parsed.data.description,
      verified: parsed.data.verified,
      categories: {
        createMany: {
          data: parsed.data.categoryIds.map((cid) => ({ categoryId: cid })),
          skipDuplicates: true,
        },
      },
      serviceAreas: {
        createMany: { data: parsed.data.serviceAreas, skipDuplicates: true },
      },
    },
    include: {
      categories: { include: { category: true } },
      serviceAreas: true,
    },
  })

  await createAuditLog({
    userId: admin!.id,
    action: 'ADMIN_ACTION',
    entity: 'ServiceProvider',
    entityId: provider.id,
    metadata: { action: 'create_provider', businessName: provider.businessName },
  })

  return NextResponse.json(provider, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const providerId = searchParams.get('id')
  if (!providerId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { verified, active } = body as { verified?: boolean; active?: boolean }

  const updated = await prisma.serviceProvider.update({
    where: { id: providerId },
    data: {
      ...(verified !== undefined ? { verified } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  })

  await createAuditLog({
    userId: admin!.id,
    action: verified ? 'PROVIDER_VERIFIED' : 'PROVIDER_UPDATED',
    entity: 'ServiceProvider',
    entityId: providerId,
    metadata: { verified, active },
  })

  return NextResponse.json(updated)
}
