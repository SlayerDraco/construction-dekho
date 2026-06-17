import { prisma } from './prisma'

// ============================================================
// ROADMAP ENGINE
// The heart of HCOS - generates and manages the construction roadmap
// ============================================================

export async function initializeHouseRoadmap(houseId: string): Promise<void> {
  const stages = await prisma.stage.findMany({
    where: { active: true },
    orderBy: { displayOrder: 'asc' },
    include: { tasks: { where: { active: true } } },
  })

  const houseFeatures = await prisma.houseFeature.findMany({
    where: { houseId, enabled: true },
    include: {
      feature: { include: { featureTasks: { include: { task: true } } } },
    },
  })

  const injectedTaskIds = new Set(
    houseFeatures.flatMap((hf: any) => hf.feature.featureTasks.map((ft: any) => ft.taskId))
  )

  for (const stage of stages) {
    await prisma.houseStage.upsert({
      where: { houseId_stageId: { houseId, stageId: stage.id } },
      update: {},
      create: { houseId, stageId: stage.id, status: 'NOT_STARTED' },
    })

    for (const task of stage.tasks) {
      await prisma.houseTask.upsert({
        where: { houseId_taskId: { houseId, taskId: task.id } },
        update: {},
        create: { houseId, taskId: task.id, status: 'PENDING' },
      })
    }
  }

  const allDecisions = await prisma.decision.findMany({ where: { active: true } })
  for (const decision of allDecisions) {
    await prisma.houseDecision.upsert({
      where: { houseId_decisionId: { houseId, decisionId: decision.id } },
      update: {},
      create: { houseId, decisionId: decision.id },
    })
  }
}

export async function injectFeatureTasks(houseId: string, featureId: string): Promise<void> {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { featureTasks: { include: { task: { include: { stage: true } } } } },
  })
  if (!feature) return

  for (const ft of (feature as any).featureTasks) {
    await prisma.houseTask.upsert({
      where: { houseId_taskId: { houseId, taskId: ft.taskId } },
      update: {},
      create: { houseId, taskId: ft.taskId, status: 'PENDING' },
    })
  }
}

export async function removeFeatureTasks(houseId: string, featureId: string): Promise<void> {
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { featureTasks: true },
  })
  if (!feature) return

  for (const ft of (feature as any).featureTasks) {
    const task = await prisma.task.findUnique({ where: { id: ft.taskId } })
    if (task && (task as any).taskType === 'OPTIONAL') {
      await prisma.houseTask.deleteMany({ where: { houseId, taskId: ft.taskId } })
    }
  }
}

export async function calculateHouseProgress(houseId: string): Promise<number> {
  const houseTasks = await prisma.houseTask.findMany({
    where: { houseId },
    include: { task: true },
  })

  if (houseTasks.length === 0) return 0

  const totalWeight = houseTasks.reduce((sum: number, ht: any) => sum + ht.task.weight, 0)
  const completedWeight = houseTasks
    .filter((ht: any) => ht.status === 'COMPLETED' || ht.status === 'SKIPPED')
    .reduce((sum: number, ht: any) => sum + ht.task.weight, 0)

  if (totalWeight === 0) return 0
  return Math.round((completedWeight / totalWeight) * 100)
}

export async function getStageCompletionCheck(
  houseId: string,
  stageId: string
): Promise<{
  canComplete: boolean
  mandatoryIncomplete: string[]
  recommendedIncomplete: string[]
  optionalIncomplete: string[]
}> {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { tasks: { where: { active: true } } },
  })

  if (!stage) return { canComplete: false, mandatoryIncomplete: [], recommendedIncomplete: [], optionalIncomplete: [] }

  const houseTasks = await prisma.houseTask.findMany({
    where: { houseId, taskId: { in: (stage as any).tasks.map((t: any) => t.id) } },
    include: { task: true },
  })

  const mandatoryIncomplete: string[] = []
  const recommendedIncomplete: string[] = []
  const optionalIncomplete: string[] = []

  for (const ht of houseTasks) {
    const status = (ht as any).status
    if (status === 'PENDING' || status === 'IN_PROGRESS' || status === 'BLOCKED') {
      const taskType = (ht as any).task.taskType
      if (taskType === 'MANDATORY') mandatoryIncomplete.push((ht as any).task.name)
      else if (taskType === 'RECOMMENDED') recommendedIncomplete.push((ht as any).task.name)
      else optionalIncomplete.push((ht as any).task.name)
    }
  }

  return {
    canComplete: mandatoryIncomplete.length === 0,
    mandatoryIncomplete,
    recommendedIncomplete,
    optionalIncomplete,
  }
}

export async function completeStage(
  houseId: string,
  stageId: string,
  forceComplete: boolean = false
): Promise<{ success: boolean; status: string; skippedTasks: string[] }> {
  const check = await getStageCompletionCheck(houseId, stageId)
  if (!check.canComplete && !forceComplete) {
    return { success: false, status: 'IN_PROGRESS', skippedTasks: check.mandatoryIncomplete }
  }

  const skippedTasks: string[] = []
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: { tasks: { where: { active: true } } },
  })
  if (!stage) return { success: false, status: 'IN_PROGRESS', skippedTasks: [] }

  if (forceComplete) {
    const incompleteTasks = await prisma.houseTask.findMany({
      where: {
        houseId,
        taskId: { in: (stage as any).tasks.map((t: any) => t.id) },
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
      },
      include: { task: true },
    })
    for (const ht of incompleteTasks) {
      await prisma.houseTask.update({
        where: { id: ht.id },
        data: { status: 'SKIPPED' },
      })
      skippedTasks.push((ht as any).task.name)
    }
  }

  const stageStatus = forceComplete && skippedTasks.length > 0 ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED'

  await prisma.houseStage.update({
    where: { houseId_stageId: { houseId, stageId } },
    data: { status: stageStatus, completedAt: new Date() },
  })

  const progress = await calculateHouseProgress(houseId)
  await prisma.house.update({ where: { id: houseId }, data: { currentProgress: progress } })
  await checkAndAwardMilestones(houseId, stageId)

  return { success: true, status: stageStatus, skippedTasks }
}

export async function checkAndAwardMilestones(houseId: string, completedStageId: string): Promise<void> {
  const completedStage = await prisma.stage.findUnique({ where: { id: completedStageId } })
  if (!completedStage) return

  const milestoneMap: Record<string, string> = {
    'Foundation': 'Foundation Complete',
    'Structure': 'Structure Complete',
    'Utilities': 'Utilities Complete',
    'Fixtures & Installations': 'Interior Complete',
    'Move-In Ready': 'Move-In Ready',
  }

  const milestoneTitle = milestoneMap[(completedStage as any).name]
  if (!milestoneTitle) return

  const milestone = await prisma.milestone.findFirst({ where: { title: milestoneTitle } })
  if (!milestone) return

  await prisma.houseMilestone.upsert({
    where: { houseId_milestoneId: { houseId, milestoneId: milestone.id } },
    update: {},
    create: { houseId, milestoneId: milestone.id },
  })
}

export async function getNextStage(houseId: string): Promise<{ id: string; name: string; displayOrder: number } | null> {
  const houseStages = await prisma.houseStage.findMany({
    where: { houseId },
    include: { stage: true },
    orderBy: { stage: { displayOrder: 'asc' } },
  })
  for (const hs of houseStages) {
    if ((hs as any).status === 'NOT_STARTED' || (hs as any).status === 'IN_PROGRESS') {
      return { id: (hs as any).stage.id, name: (hs as any).stage.name, displayOrder: (hs as any).stage.displayOrder }
    }
  }
  return null
}

export async function getCurrentStage(houseId: string): Promise<{ id: string; name: string; displayOrder: number } | null> {
  const houseStage = await prisma.houseStage.findFirst({
    where: { houseId, status: 'IN_PROGRESS' },
    include: { stage: true },
    orderBy: { stage: { displayOrder: 'asc' } },
  })
  if (houseStage) return { id: (houseStage as any).stage.id, name: (houseStage as any).stage.name, displayOrder: (houseStage as any).stage.displayOrder }

  const nextStage = await prisma.houseStage.findFirst({
    where: { houseId, status: 'NOT_STARTED' },
    include: { stage: true },
    orderBy: { stage: { displayOrder: 'asc' } },
  })
  if (nextStage) return { id: (nextStage as any).stage.id, name: (nextStage as any).stage.name, displayOrder: (nextStage as any).stage.displayOrder }
  return null
}
