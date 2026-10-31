import { getCurrentUser } from '@/lib/auth';

import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { HouseOverview } from '@/components/house/house-overview'

export async function generateMetadata({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const house = await prisma.house.findUnique({ where: { id: houseId }, select: { projectName: true } })
  return { title: house?.projectName ?? 'House' }
}

export default async function HousePage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?.id;
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  // Bypassed onboarding redirect loop

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      houseType: true,
      owner: { select: { id: true, fullName: true, email: true, profileImage: true } },
      members: { include: { user: { select: { id: true, fullName: true, profileImage: true } } } },
      houseStages: {
        include: { stage: true },
        orderBy: { stage: { displayOrder: 'asc' } },
      },
      houseAlerts: {
        where: { acknowledged: false },
        include: { alert: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      houseDecisions: {
        where: { completedAt: null },
        include: { decision: { include: { stage: true } } },
        take: 5,
      },
      houseMilestones: { include: { milestone: true } },
      expenses: { select: { amount: true, category: true } },
      progressUpdates: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { fullName: true, profileImage: true } },
          media: { take: 2 },
          verification: true,
        },
      },
      houseFeatures: { where: { enabled: true }, include: { feature: true } },
      _count: { select: { documents: true, progressUpdates: true, members: true } },
    },
  })

  if (!house) notFound()

  // Check access
  const isOwner = house.ownerId === user.id
  const isMember = house.members.some((m) => m.userId === user.id)
  const isAdmin = user.role === 'ADMIN'
  if (!isOwner && !isMember && !isAdmin) redirect('/houses')

  return (
    <DashboardLayout houseId={houseId}>
      <HouseOverview house={house} currentUser={user} />
    </DashboardLayout>
  )
}
