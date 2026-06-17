import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  // Get user's houses with progress data
  const houses = await prisma.house.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
      projectStatus: { not: 'ARCHIVED' },
    },
    include: {
      houseType: true,
      houseStages: {
        include: { stage: true },
        orderBy: { stage: { displayOrder: 'asc' } },
      },
      houseAlerts: {
        where: { acknowledged: false },
        include: { alert: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      houseDecisions: {
        where: { completedAt: null },
        include: { decision: { include: { stage: true } } },
        take: 5,
      },
      expenses: { select: { amount: true } },
      progressUpdates: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          submitter: { select: { fullName: true, profileImage: true } },
          media: { take: 1 },
        },
      },
      houseMilestones: { include: { milestone: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return <DashboardContent user={user} houses={houses} notifications={notifications} />
}
