import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProgressView } from '@/components/progress/progress-view'

export const metadata = { title: 'Progress Updates' }

export default async function ProgressPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const member = await prisma.houseMember.findUnique({ where: { houseId_userId: { houseId, userId: user.id } } })
  if (!isOwner && !member && user.role !== 'ADMIN') redirect('/houses')

  const updates = await prisma.progressUpdate.findMany({
    where: { houseId },
    include: {
      submitter: { select: { id: true, fullName: true, profileImage: true, role: true } },
      media: true,
      verification: { include: { verifier: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const canSubmit = isOwner || member?.role === 'CONTRACTOR' || member?.role === 'ARCHITECT' || user.role === 'ADMIN'
  const canVerify = isOwner || user.role === 'ADMIN'

  return (
    <DashboardLayout houseId={houseId}>
      <ProgressView
        houseId={houseId}
        houseName={house.projectName}
        updates={updates}
        currentUserId={user.id}
        canSubmit={canSubmit}
        canVerify={canVerify}
      />
    </DashboardLayout>
  )
}
