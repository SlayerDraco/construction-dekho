import { PrismaClient } from '@prisma/client'
import { runDirectoryFoundation } from '../src/lib/directory/run'

const prisma = new PrismaClient()

const STAGES = [
  { name: 'Site Preparation', description: 'Clearing, levelling and marking out the plot.', tasks: ['Site survey & soil test', 'Clear & level plot', 'Mark foundation layout'], decisions: ['Select architect'] },
  { name: 'Foundation', description: 'Excavation, footings and plinth beam.', tasks: ['Excavation', 'Footing reinforcement & casting', 'Plinth beam & backfilling'], decisions: ['Choose cement & steel brand'] },
  { name: 'Structure', description: 'Columns, beams, slabs and brickwork.', tasks: ['Column & beam casting', 'Slab shuttering & casting', 'Brickwork'], decisions: ['Select brick type'] },
  { name: 'MEP', description: 'Electrical, plumbing and drainage rough-ins.', tasks: ['Electrical conduit & wiring', 'Plumbing & drainage lines', 'Pressure & leak testing'], decisions: ['Finalise switch & fitting brands'] },
  { name: 'Finishing', description: 'Plastering, flooring, painting and fixtures.', tasks: ['Plastering', 'Flooring & tiling', 'Painting', 'Fixtures & fittings'], decisions: ['Choose flooring', 'Pick paint colours'] },
  { name: 'Handover', description: 'Final inspection, snagging and possession.', tasks: ['Snagging inspection', 'Final cleaning', 'Handover & documentation'], decisions: [] },
]

const FEATURES = [
  { name: 'Solar Water Heater', category: 'ENERGY' },
  { name: 'Rainwater Harvesting', category: 'WATER' },
  { name: 'Smart Door Lock', category: 'SMART_HOME' },
  { name: 'CCTV Wiring', category: 'SECURITY' },
] as const

async function main() {
  console.log('Seeding demo data...')

  // ---------- Catalog ----------
  const houseType = await prisma.houseType.upsert({
    where: { name: 'Independent House' },
    update: {},
    create: { name: 'Independent House', description: 'Single-family independent home' },
  })
  const duplex = await prisma.houseType.upsert({
    where: { name: 'Duplex' },
    update: {},
    create: { name: 'Duplex', description: 'Two-floor home with shared walls' },
  })

  const stages: { id: string; name: string; order: number }[] = []
  const tasksByStage: Record<string, { id: string; weight: number }[]> = {}
  const decisionsByStage: Record<string, { id: string }[]> = {}

  for (const [i, s] of STAGES.entries()) {
    const stage = await prisma.stage.upsert({
      where: { name: s.name },
      update: { displayOrder: i + 1, description: s.description },
      create: { name: s.name, description: s.description, displayOrder: i + 1 },
    })
    stages.push({ id: stage.id, name: stage.name, order: i + 1 })
    tasksByStage[stage.id] = []
    decisionsByStage[stage.id] = []

    for (const t of s.tasks) {
      const existing = await prisma.task.findFirst({ where: { stageId: stage.id, name: t } })
      const task = existing ?? (await prisma.task.create({ data: { stageId: stage.id, name: t, weight: 10 } }))
      tasksByStage[stage.id].push({ id: task.id, weight: task.weight })
    }
    for (const d of s.decisions) {
      const existing = await prisma.decision.findFirst({ where: { stageId: stage.id, title: d } })
      const decision = existing ?? (await prisma.decision.create({ data: { stageId: stage.id, title: d, required: true } }))
      decisionsByStage[stage.id].push({ id: decision.id })
    }
  }

  for (const f of FEATURES) {
    await prisma.feature.upsert({ where: { name: f.name }, update: {}, create: { name: f.name, category: f.category } })
  }

  const categories: Record<string, string> = {}
  for (const name of ['Electrical', 'Plumbing', 'Masonry', 'Interior Design', 'Painting']) {
    const c = await prisma.serviceCategory.upsert({ where: { name }, update: {}, create: { name } })
    categories[name] = c.id
  }

  // ---------- Demo users (ids match src/lib/demo-profiles.ts) ----------
  const users = [
    { id: 'demo-admin-001', fullName: 'Aryaman', email: 'admin@constructiondekho.com', role: 'ADMIN' as const },
    { id: 'demo-client-002', fullName: 'Sharma Family', email: 'sharma@example.com', role: 'OWNER' as const },
    { id: 'demo-client-003', fullName: 'Nair Family', email: 'nair@example.com', role: 'OWNER' as const },
    { id: 'demo-provider-001', fullName: 'Ravi Kumar', email: 'ravi@brightspark.example.com', role: 'SERVICE_PROVIDER' as const },
    { id: 'demo-provider-002', fullName: 'Imran Shaikh', email: 'imran@aquaflow.example.com', role: 'SERVICE_PROVIDER' as const },
    { id: 'demo-provider-003', fullName: 'Meera Joshi', email: 'meera@colorcraft.example.com', role: 'SERVICE_PROVIDER' as const },
  ]
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: { fullName: u.fullName, role: u.role }, create: u })
  }

  const providers = [
    { id: 'demo-sp-1', userId: 'demo-provider-001', businessName: 'BrightSpark Electricals', description: 'Residential wiring, panels and smart-home electrical work.', verified: true, category: 'Electrical', city: 'Bangalore' },
    { id: 'demo-sp-2', userId: 'demo-provider-002', businessName: 'AquaFlow Plumbing', description: 'Plumbing, drainage and water-tank installations.', verified: true, category: 'Plumbing', city: 'Mumbai' },
    { id: 'demo-sp-3', userId: 'demo-provider-003', businessName: 'ColorCraft Painters', description: 'Interior and exterior painting with 5-year warranty.', verified: false, category: 'Painting', city: 'Bangalore' },
  ]
  for (const p of providers) {
    await prisma.serviceProvider.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, userId: p.userId, businessName: p.businessName, description: p.description, verified: p.verified },
    })
    await prisma.serviceProviderCategory.upsert({
      where: { providerId_categoryId: { providerId: p.id, categoryId: categories[p.category] } },
      update: {},
      create: { providerId: p.id, categoryId: categories[p.category] },
    })
    await prisma.serviceArea.upsert({
      where: { providerId_city: { providerId: p.id, city: p.city } },
      update: {},
      create: { providerId: p.id, city: p.city },
    })
  }

  // ---------- Demo houses (recreated on every seed) ----------
  await prisma.house.deleteMany({ where: { id: { in: ['demo-house-sharma', 'demo-house-nair'] } } })

  const houses = [
    { id: 'demo-house-sharma', ownerId: 'demo-client-002', projectName: 'Sharma Villa', city: 'Bangalore', state: 'Karnataka', plotSize: 2400, houseTypeId: houseType.id, floors: 2, bedrooms: 4, bathrooms: 4, parkingSpaces: 2, completedStages: 6, status: 'COMPLETED' as const },
    { id: 'demo-house-nair', ownerId: 'demo-client-003', projectName: 'Nair Duplex', city: 'Mumbai', state: 'Maharashtra', plotSize: 1500, houseTypeId: duplex.id, floors: 2, bedrooms: 3, bathrooms: 3, parkingSpaces: 1, completedStages: 3, status: 'ACTIVE' as const },
  ]

  for (const h of houses) {
    const { completedStages, status, ...data } = h
    const allTasks = stages.flatMap((s) => tasksByStage[s.id])
    let done = 0
    stages.forEach((s) => {
      if (s.order <= completedStages) done += tasksByStage[s.id].reduce((a, t) => a + t.weight, 0)
    })
    const total = allTasks.reduce((a, t) => a + t.weight, 0)
    const progress = status === 'COMPLETED' ? 100 : Math.round(((done + 10) / total) * 100)

    await prisma.house.create({ data: { ...data, projectStatus: status, currentProgress: progress } })

    for (const s of stages) {
      const state = s.order <= completedStages ? 'COMPLETED' : s.order === completedStages + 1 ? 'IN_PROGRESS' : 'NOT_STARTED'
      await prisma.houseStage.create({
        data: {
          houseId: h.id,
          stageId: s.id,
          status: state,
          startedAt: state !== 'NOT_STARTED' ? new Date(Date.now() - (7 - s.order) * 30 * 86400000) : null,
          completedAt: state === 'COMPLETED' ? new Date(Date.now() - (6 - s.order) * 30 * 86400000) : null,
        },
      })
      for (const [ti, t] of tasksByStage[s.id].entries()) {
        const taskDone = state === 'COMPLETED' || (state === 'IN_PROGRESS' && ti === 0)
        await prisma.houseTask.create({
          data: { houseId: h.id, taskId: t.id, status: taskDone ? 'COMPLETED' : state === 'IN_PROGRESS' && ti === 1 ? 'IN_PROGRESS' : 'PENDING', completedAt: taskDone ? new Date() : null },
        })
      }
      for (const d of decisionsByStage[s.id]) {
        const decided = s.order <= completedStages
        await prisma.houseDecision.create({
          data: { houseId: h.id, decisionId: d.id, selectedValue: decided ? 'Confirmed' : null, completedAt: decided ? new Date() : null },
        })
      }
    }

    await prisma.houseMember.create({ data: { houseId: h.id, userId: h.ownerId, role: 'OWNER' } })
    await prisma.expense.createMany({
      data: [
        { houseId: h.id, category: 'MATERIALS', amount: 1850000, notes: 'Cement, steel and bricks' },
        { houseId: h.id, category: 'LABOUR', amount: 920000, notes: 'Mason and helpers' },
        { houseId: h.id, category: 'ELECTRICAL', amount: 340000, notes: 'Wiring and panel' },
        { houseId: h.id, category: 'PLUMBING', amount: 285000, notes: 'Pipes and fittings' },
        ...(status === 'COMPLETED'
          ? [
              { houseId: h.id, category: 'FLOORING' as const, amount: 610000, notes: 'Vitrified tiles' },
              { houseId: h.id, category: 'PAINTING' as const, amount: 260000, notes: 'Interior & exterior' },
            ]
          : []),
      ],
    })
    await prisma.document.createMany({
      data: [
        { houseId: h.id, name: 'Architectural Plan', documentType: 'PLAN', fileUrl: '#' },
        { houseId: h.id, name: 'Structural Drawing', documentType: 'DRAWING', fileUrl: '#' },
        { houseId: h.id, name: 'Cement Invoice', documentType: 'INVOICE', fileUrl: '#' },
      ],
    })
    await prisma.houseProvider.create({ data: { houseId: h.id, providerId: h.city === 'Bangalore' ? 'demo-sp-1' : 'demo-sp-2' } })
    await prisma.progressUpdate.create({
      data: { houseId: h.id, submittedBy: h.ownerId, title: 'Site visit update', description: 'Work progressing on schedule. Photos shared with the contractor.' },
    })
  }

  // Alerts for the in-progress house
  const alert = await prisma.alert.create({
    data: { type: 'WARNING', title: 'Curing period in progress', description: 'Keep the slab wet for at least 7 days before removing shuttering.', severity: 'MEDIUM', stageId: stages[2].id },
  })
  const alert2 = await prisma.alert.create({
    data: { type: 'DECISION', title: 'Flooring decision due', description: 'Select flooring before the finishing stage begins.', severity: 'HIGH', stageId: stages[4].id },
  })
  await prisma.houseAlert.createMany({
    data: [
      { houseId: 'demo-house-nair', alertId: alert.id },
      { houseId: 'demo-house-nair', alertId: alert2.id },
    ],
  })

  await prisma.review.create({
    data: { providerId: 'demo-sp-1', houseId: 'demo-house-sharma', rating: 5, wouldHireAgain: true },
  })

  for (const uid of ['demo-client-002', 'demo-client-003']) {
    await prisma.notification.deleteMany({ where: { userId: uid } })
    await prisma.notification.createMany({
      data: [
        { userId: uid, title: 'Welcome to Construction Dekho', body: 'Your project dashboard is ready to explore.' },
        { userId: uid, title: 'New progress update', body: 'A site update was posted for your project.', read: true },
      ],
    })
  }
  await prisma.claimRequest.deleteMany({ where: { claimantId: 'demo-admin-001' } })

  // ---------- Business directory foundation (taxonomy, sources, backfill of providers above) ----------
  const directory = await runDirectoryFoundation(prisma)
  console.log('Directory foundation:', JSON.stringify(directory))

  console.log('✅ Demo data seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
