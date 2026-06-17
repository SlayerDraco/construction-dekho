import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateAlertsForHouse } from '@/lib/alert-engine'

const updateDecisionSchema = z.object({
  decisionId: z.string().uuid(),
  selectedValue: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const decisions = await prisma.houseDecision.findMany({
    where: { houseId },
    include: {
      decision: {
        include: { stage: { select: { id: true, name: true, displayOrder: true } } },
      },
    },
    orderBy: { decision: { stage: { displayOrder: 'asc' } } },
  })

  return NextResponse.json(decisions)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'decision:write')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { decisionId, selectedValue, notes } = parsed.data

  const houseDecision = await prisma.houseDecision.upsert({
    where: { houseId_decisionId: { houseId, decisionId } },
    update: { selectedValue, notes, completedAt: new Date() },
    create: { houseId, decisionId, selectedValue, notes, completedAt: new Date() },
    include: { decision: { include: { stage: true } } },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'DECISION_UPDATED',
    entity: 'Decision',
    entityId: decisionId,
    metadata: { decisionTitle: houseDecision.decision.title, selectedValue },
  })

  // Re-generate alerts (may resolve pending decision alerts)
  await generateAlertsForHouse(houseId)

  return NextResponse.json(houseDecision)
}
