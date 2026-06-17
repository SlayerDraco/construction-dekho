import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { calculateHouseProgress } from '@/lib/roadmap-engine'
import { createAuditLog } from '@/lib/audit'

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED']),
  notes: z.string().max(1000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const tasks = await prisma.houseTask.findMany({
    where: { houseId },
    include: {
      task: {
        include: {
          stage: { select: { id: true, name: true, displayOrder: true } },
          depsTo: { include: { dependsOn: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { task: { stage: { displayOrder: 'asc' } } },
  })

  return NextResponse.json(tasks)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'task:write')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { taskId, status, notes } = parsed.data

  // Check if house task exists
  const houseTask = await prisma.houseTask.findUnique({
    where: { houseId_taskId: { houseId, taskId } },
    include: { task: true },
  })

  if (!houseTask) {
    return NextResponse.json({ error: 'Task not found for this house' }, { status: 404 })
  }

  const updatedTask = await prisma.houseTask.update({
    where: { houseId_taskId: { houseId, taskId } },
    data: {
      status,
      notes,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
    include: { task: true },
  })

  // Update stage status to IN_PROGRESS when a task is started
  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    const stage = await prisma.stage.findUnique({ where: { id: houseTask.task.stageId } })
    if (stage) {
      const houseStage = await prisma.houseStage.findUnique({
        where: { houseId_stageId: { houseId, stageId: stage.id } },
      })
      if (houseStage && houseStage.status === 'NOT_STARTED') {
        await prisma.houseStage.update({
          where: { houseId_stageId: { houseId, stageId: stage.id } },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        })
      }
    }
  }

  // Recalculate progress
  const progress = await calculateHouseProgress(houseId)
  await prisma.house.update({
    where: { id: houseId },
    data: { currentProgress: progress },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_SKIPPED',
    entity: 'Task',
    entityId: taskId,
    metadata: { taskName: houseTask.task.name, status, notes },
  })

  return NextResponse.json({ ...updatedTask, progress })
}
