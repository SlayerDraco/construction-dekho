import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { injectFeatureTasks, removeFeatureTasks } from '@/lib/roadmap-engine'
import { createAuditLog } from '@/lib/audit'
import { generateAlertsForHouse } from '@/lib/alert-engine'

const toggleFeatureSchema = z.object({
  featureId: z.string().uuid(),
  enabled: z.boolean(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const features = await prisma.houseFeature.findMany({
    where: { houseId },
    include: { feature: true },
    orderBy: { feature: { category: 'asc' } },
  })

  // Also return all available features so UI can show toggle options
  const allFeatures = await prisma.feature.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const enabledIds = new Set(features.filter((f) => f.enabled).map((f) => f.featureId))

  return NextResponse.json({
    enabled: features.filter((f) => f.enabled),
    all: allFeatures.map((f) => ({
      ...f,
      enabled: enabledIds.has(f.id),
    })),
  })
}

export async function POST(
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

  const parsed = toggleFeatureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { featureId, enabled } = parsed.data

  // Validate feature exists
  const feature = await prisma.feature.findUnique({ where: { id: featureId } })
  if (!feature) {
    return NextResponse.json({ error: 'Feature not found' }, { status: 404 })
  }

  const houseFeature = await prisma.houseFeature.upsert({
    where: { houseId_featureId: { houseId, featureId } },
    update: { enabled },
    create: { houseId, featureId, enabled },
    include: { feature: true },
  })

  // Inject or remove tasks based on feature state
  if (enabled) {
    await injectFeatureTasks(houseId, featureId)
    await createAuditLog({
      userId: user!.id,
      houseId,
      action: 'FEATURE_ADDED',
      entity: 'Feature',
      entityId: featureId,
      metadata: { featureName: feature.name },
    })
  } else {
    await removeFeatureTasks(houseId, featureId)
    await createAuditLog({
      userId: user!.id,
      houseId,
      action: 'FEATURE_REMOVED',
      entity: 'Feature',
      entityId: featureId,
      metadata: { featureName: feature.name },
    })
  }

  // Re-generate alerts after feature change
  await generateAlertsForHouse(houseId)

  return NextResponse.json(houseFeature)
}
