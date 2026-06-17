import { prisma } from './prisma'

export async function generateAlertsForHouse(houseId: string): Promise<void> {
  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseStages: { include: { stage: { include: { tasks: true } } } },
      houseTasks: { include: { task: { include: { depsTo: { include: { dependsOn: true } } } } } },
      houseDecisions: { include: { decision: { include: { stage: true } } } },
      houseAlerts: true,
      expenses: true,
    },
  })
  if (!house) return

  // 1. Dependency alerts
  for (const houseTask of (house as any).houseTasks) {
    if (houseTask.status === 'BLOCKED') continue
    for (const dep of houseTask.task.depsTo) {
      const depHouseTask = (house as any).houseTasks.find((ht: any) => ht.taskId === dep.dependsOnTaskId)
      if (depHouseTask && depHouseTask.status !== 'COMPLETED') {
        await upsertHouseAlert(houseId, {
          type: 'DEPENDENCY',
          title: `Dependency Blocked: ${houseTask.task.name}`,
          description: `"${houseTask.task.name}" cannot start until "${dep.dependsOn.name}" is completed.`,
          severity: 'HIGH',
        })
        await prisma.houseTask.update({ where: { id: houseTask.id }, data: { status: 'BLOCKED' } })
      }
    }
  }

  // 2. Decision alerts
  const currentStage = (house as any).houseStages.find((hs: any) => hs.status === 'IN_PROGRESS')
  if (currentStage) {
    const pendingDecisions = (house as any).houseDecisions.filter(
      (hd: any) => !hd.completedAt && hd.decision.required && hd.decision.stageId === currentStage.stageId
    )
    for (const pd of pendingDecisions) {
      await upsertHouseAlert(houseId, {
        type: 'DECISION',
        title: `Decision Required: ${pd.decision.title}`,
        description: pd.decision.description ?? `A required decision is pending for the ${currentStage.stage.name} stage.`,
        severity: 'MEDIUM',
      })
    }
  }

  // 3. Progress alerts
  const lastUpdate = await prisma.progressUpdate.findFirst({
    where: { houseId },
    orderBy: { createdAt: 'desc' },
  })
  const activeStage = (house as any).houseStages.find((hs: any) => hs.status === 'IN_PROGRESS' || hs.status === 'NOT_STARTED')
  if (activeStage) {
    const daysSinceUpdate = lastUpdate
      ? Math.floor((Date.now() - new Date(lastUpdate.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null
    if (!lastUpdate || (daysSinceUpdate !== null && daysSinceUpdate >= 7)) {
      await upsertHouseAlert(houseId, {
        type: 'PROGRESS',
        title: 'No Recent Progress Updates',
        description: lastUpdate
          ? `No progress updates received in the last ${daysSinceUpdate} days.`
          : 'No progress updates have been submitted yet.',
        severity: 'MEDIUM',
      })
    }
  }

  // 4. Budget alerts
  const totalExpenses = (house as any).expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
  if (totalExpenses > 0 && currentStage) {
    const costEstimates = await prisma.costEstimate.findMany({
      where: { stageId: currentStage.stageId, city: (house as any).city },
    })
    for (const est of costEstimates) {
      if (totalExpenses > (est as any).maxCost * 1.2) {
        await upsertHouseAlert(houseId, {
          type: 'BUDGET',
          title: 'Budget Overrun Detected',
          description: `Project spending has exceeded the estimated range.`,
          severity: 'HIGH',
        })
      }
    }
  }

  // 5. Stage-specific warnings
  const utilitiesStage = (house as any).houseStages.find((hs: any) => hs.stage.name === 'Utilities')
  const surfacePrepStage = (house as any).houseStages.find((hs: any) => hs.stage.name === 'Surface Preparation')
  if (utilitiesStage && surfacePrepStage && surfacePrepStage.status === 'IN_PROGRESS') {
    const utilityTestTask = (house as any).houseTasks.find((ht: any) => ht.task.name === 'Utility Testing')
    if (utilityTestTask && utilityTestTask.status !== 'COMPLETED') {
      await upsertHouseAlert(houseId, {
        type: 'WARNING',
        title: 'Utilities Not Fully Tested',
        description: 'Surface preparation has started but utility testing is incomplete.',
        severity: 'CRITICAL',
      })
    }
  }

  const waterproofingTestTask = (house as any).houseTasks.find((ht: any) => ht.task.name === 'Waterproofing Test')
  const flooringStage = (house as any).houseStages.find((hs: any) => hs.stage.name === 'Flooring & Finishes')
  if (flooringStage && flooringStage.status === 'IN_PROGRESS' && waterproofingTestTask && waterproofingTestTask.status !== 'COMPLETED') {
    await upsertHouseAlert(houseId, {
      type: 'DEPENDENCY',
      title: 'Waterproofing Test Incomplete',
      description: 'Flooring installation has started but the waterproofing test has not been completed.',
      severity: 'CRITICAL',
    })
  }
}

async function upsertHouseAlert(
  houseId: string,
  alertData: { type: string; title: string; description: string; severity: string }
): Promise<void> {
  let alert = await prisma.alert.findFirst({ where: { title: alertData.title } })
  if (!alert) {
    alert = await prisma.alert.create({
      data: {
        type: alertData.type as any,
        title: alertData.title,
        description: alertData.description,
        severity: alertData.severity as any,
      },
    })
  }
  const existing = await prisma.houseAlert.findFirst({
    where: { houseId, alertId: alert.id, acknowledged: false },
  })
  if (!existing) {
    await prisma.houseAlert.create({ data: { houseId, alertId: alert.id } })
  }
}

export async function acknowledgeAlert(houseId: string, houseAlertId: string): Promise<void> {
  await prisma.houseAlert.updateMany({
    where: { id: houseAlertId, houseId },
    data: { acknowledged: true },
  })
}

export async function getActiveAlerts(houseId: string) {
  return prisma.houseAlert.findMany({
    where: { houseId, acknowledged: false },
    include: { alert: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function generateWeatherAlert(
  houseId: string,
  alertMessage: string,
  severity: string = 'MEDIUM'
): Promise<void> {
  await prisma.weatherAlert.create({
    data: { houseId, alertMessage, severity: severity as any },
  })
}
