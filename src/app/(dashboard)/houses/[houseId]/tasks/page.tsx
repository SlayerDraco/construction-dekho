import { getCurrentUser } from '@/lib/auth';

import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TasksView } from '@/components/house/tasks-view'

export const metadata = { title: 'Tasks' }

export default async function TasksPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?.id;
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  // Bypassed onboarding redirect loop

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const member = await prisma.houseMember.findUnique({ where: { houseId_userId: { houseId, userId: user.id } } })
  if (!isOwner && !member && user.role !== 'ADMIN') redirect('/houses')

  const houseTasks = await prisma.houseTask.findMany({
    where: { houseId },
    include: {
      task: {
        include: {
          stage: { select: { id: true, name: true, displayOrder: true } },
        },
      },
    },
    orderBy: [{ task: { stage: { displayOrder: 'asc' } } }, { task: { taskType: 'asc' } }],
  })

  const canEdit = isOwner || user.role === 'ADMIN' || member?.role === 'CONTRACTOR'

  return (
    <DashboardLayout houseId={houseId}>
      <TasksView
        houseId={houseId}
        houseName={house.projectName}
        houseTasks={houseTasks}
        canEdit={canEdit}
        progress={house.currentProgress}
      />
    </DashboardLayout>
  )
}
