import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { completeStage, getStageCompletionCheck, calculateHouseProgress } from '@/lib/roadmap-engine'
import { generateAlertsForHouse } from '@/lib/alert-engine'
import { createAuditLog } from '@/lib/audit'
import { createNotificationForHouseMembers } from '@/lib/notifications'

const completeStageSchema = z.object({
  forceComplete: z.boolean().default(false),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const stages = await prisma.houseStage.findMany({
    where: { houseId },
    include: {
      stage: {
        include: {
          tasks: { where: { active: true }, orderBy: { taskType: 'asc' } },
          decisions: { where: { active: true } },
          costEstimates: true,
        },
      },
    },
    orderBy: { stage: { displayOrder: 'asc' } },
  })

  // Merge with house task statuses
  const houseTasks = await prisma.houseTask.findMany({ where: { houseId } })
  const houseDecisions = await prisma.houseDecision.findMany({ where: { houseId } })

  const taskStatusMap = new Map(houseTasks.map((ht) => [ht.taskId, ht]))
  const decisionMap = new Map(houseDecisions.map((hd) => [hd.decisionId, hd]))

  const enriched = stages.map((hs) => ({
    ...hs,
    stage: {
      ...hs.stage,
      tasks: hs.stage.tasks.map((t) => ({
        ...t,
        houseTask: taskStatusMap.get(t.id) ?? null,
      })),
      decisions: hs.stage.decisions.map((d) => ({
        ...d,
        houseDecision: decisionMap.get(d.id) ?? null,
      })),
    },
  }))

  return NextResponse.json(enriched)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string; stageId?: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'stage:complete')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const stageId = searchParams.get('stageId')

  if (!stageId) {
    return NextResponse.json({ error: 'stageId query param required' }, { status: 400 })
  }

  // Validate stage belongs to this house
  const houseStage = await prisma.houseStage.findUnique({
    where: { houseId_stageId: { houseId, stageId } },
    include: { stage: true },
  })

  if (!houseStage) {
    return NextResponse.json({ error: 'Stage not found for this house' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = completeStageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  // If not force completing, check first
  if (!parsed.data.forceComplete) {
    const check = await getStageCompletionCheck(houseId, stageId)
    if (!check.canComplete) {
      return NextResponse.json({
        canComplete: false,
        mandatoryIncomplete: check.mandatoryIncomplete,
        recommendedIncomplete: check.recommendedIncomplete,
        optionalIncomplete: check.optionalIncomplete,
        message: `${check.mandatoryIncomplete.length} mandatory tasks are not yet complete.`,
      })
    }
  }

  const result = await completeStage(houseId, stageId, parsed.data.forceComplete)

  if (result.success) {
    // Update house status to ACTIVE
    await prisma.house.update({
      where: { id: houseId },
      data: { projectStatus: 'ACTIVE' },
    })

    await createAuditLog({
      userId: user!.id,
      houseId,
      action: result.status === 'COMPLETED_WITH_WARNINGS' ? 'STAGE_COMPLETED_WITH_WARNINGS' : 'STAGE_COMPLETED',
      entity: 'Stage',
      entityId: stageId,
      metadata: { stageName: houseStage.stage.name, skippedTasks: result.skippedTasks },
    })

    await createNotificationForHouseMembers({
      houseId,
      title: `Stage Completed: ${houseStage.stage.name}`,
      body:
        result.status === 'COMPLETED_WITH_WARNINGS'
          ? `${houseStage.stage.name} was completed with ${result.skippedTasks.length} skipped tasks.`
          : `${houseStage.stage.name} has been successfully completed!`,
      excludeUserId: user!.id,
    })

    // Re-generate alerts
    await generateAlertsForHouse(houseId)
  }

  return NextResponse.json(result)
}
