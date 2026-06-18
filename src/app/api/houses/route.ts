import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { initializeHouseRoadmap } from '@/lib/roadmap-engine'
import { createAuditLog } from '@/lib/audit'

const createHouseSchema = z.object({
  projectName: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  plotSize: z.number().optional(),
  houseTypeId: z.string().uuid(),
  floors: z.number().int().min(1).max(10).default(1),
  bedrooms: z.number().int().min(1).max(20).default(2),
  bathrooms: z.number().int().min(1).max(20).default(2),
  parkingSpaces: z.number().int().min(0).max(10).default(1),
  features: z.array(z.string().uuid()).optional(),
})

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const query = searchParams.get('q') ?? ''
  const skip = (page - 1) * limit

  const where: any =
    (user as any).role === 'ADMIN'
      ? query ? { projectName: { contains: query, mode: 'insensitive' } } : {}
      : {
          OR: [
            { ownerId: (user as any).id },
            { members: { some: { userId: (user as any).id } } },
          ],
          ...(query ? { projectName: { contains: query, mode: 'insensitive' } } : {}),
        }

  const [houses, total] = await Promise.all([
    prisma.house.findMany({
      where,
      include: {
        houseType: true,
        owner: { select: { id: true, fullName: true, email: true } },
        houseStages: { include: { stage: true }, orderBy: { stage: { displayOrder: 'asc' } } },
        _count: { select: { members: true, expenses: true, documents: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.house.count({ where }),
  ])

  return NextResponse.json({ houses, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = createHouseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const house = await prisma.house.create({
    data: {
      ownerId: (user as any).id,
      projectName: data.projectName,
      city: data.city,
      state: data.state,
      country: 'India',
      plotSize: data.plotSize,
      houseTypeId: data.houseTypeId,
      floors: data.floors,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      parkingSpaces: data.parkingSpaces,
      projectStatus: 'PLANNING' as any,
    },
  })

  if (data.features && data.features.length > 0) {
    await prisma.houseFeature.createMany({
      data: data.features.map((fid) => ({ houseId: house.id, featureId: fid, enabled: true })),
      skipDuplicates: true,
    })
  }

try {
  await initializeHouseRoadmap(house.id)
  console.log('ROADMAP OK')
} catch (e) {
  console.error('ROADMAP FAILED', e)
}

try {
  await createAuditLog(...)
  console.log('AUDIT OK')
} catch (e) {
  console.error('AUDIT FAILED', e)
}

  const fullHouse = await prisma.house.findUnique({ where: { id: house.id }, include: { houseType: true, houseStages: { include: { stage: true } } } })
  return NextResponse.json(fullHouse, { status: 201 })
}
