import { getCurrentUser } from '@/lib/auth';

import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RoadmapView } from '@/components/roadmap/roadmap-view'

export const metadata = { title: 'Roadmap' }

export default async function RoadmapPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?.id;
  if (!userId) redirect('/?reset=1')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/?reset=1')

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseStages: {
        include: {
          stage: {
            include: {
              tasks: { where: { active: true }, orderBy: [{ taskType: 'asc' }, { weight: 'desc' }] },
              decisions: { where: { active: true } },
              costEstimates: true,
            },
          },
        },
        orderBy: { stage: { displayOrder: 'asc' } },
      },
      houseTasks: { include: { task: true } },
      houseDecisions: { include: { decision: true } },
      houseFeatures: { where: { enabled: true }, include: { feature: true } },
      houseAlerts: { where: { acknowledged: false }, include: { alert: true } },
    },
  })

  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const isMember = await prisma.houseMember.findUnique({
    where: { houseId_userId: { houseId, userId: user.id } },
  })
  if (!isOwner && !isMember && user.role !== 'ADMIN') redirect('/houses')

  return (
    <>
      <RoadmapView
        house={house}
        currentUserId={user.id}
        canEdit={isOwner || user.role === 'ADMIN'}
      />
    </>
  )
}
