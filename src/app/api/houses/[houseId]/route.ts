import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const updateHouseSchema = z.object({
  projectName: z.string().min(2).max(100).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  plotSize: z.number().optional(),
  floors: z.number().int().min(1).max(10).optional(),
  bedrooms: z.number().int().min(1).max(20).optional(),
  bathrooms: z.number().int().min(1).max(20).optional(),
  parkingSpaces: z.number().int().min(0).max(10).optional(),
  projectStatus: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseType: true,
      owner: { select: { id: true, fullName: true, email: true, profileImage: true } },
      members: {
        include: { user: { select: { id: true, fullName: true, email: true, profileImage: true } } },
      },
      houseStages: {
        include: {
          stage: {
            include: {
              tasks: { where: { active: true }, orderBy: { weight: 'desc' } },
              decisions: { where: { active: true } },
            },
          },
        },
        orderBy: { stage: { displayOrder: 'asc' } },
      },
      houseFeatures: {
        include: { feature: true },
        where: { enabled: true },
      },
      houseAlerts: {
        where: { acknowledged: false },
        include: { alert: true },
        orderBy: { createdAt: 'desc' },
      },
      houseMilestones: { include: { milestone: true } },
      _count: {
        select: { expenses: true, documents: true, progressUpdates: true },
      },
    },
  })

  if (!house) {
    return NextResponse.json({ error: 'House not found' }, { status: 404 })
  }

  return NextResponse.json(house)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'house:write')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateHouseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const house = await prisma.house.update({
    where: { id: houseId },
    data: parsed.data,
    include: { houseType: true },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'HOUSE_UPDATED',
    entity: 'House',
    entityId: houseId,
    metadata: parsed.data,
  })

  return NextResponse.json(house)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'house:delete')
  if (error) return error

  await prisma.house.update({
    where: { id: houseId },
    data: { projectStatus: 'ARCHIVED' },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'HOUSE_UPDATED',
    entity: 'House',
    entityId: houseId,
    metadata: { action: 'archived' },
  })

  return NextResponse.json({ success: true })
}
