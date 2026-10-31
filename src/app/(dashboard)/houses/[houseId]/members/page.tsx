import { getCurrentUser } from '@/lib/auth';

import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MembersView } from '@/components/house/members-view'

export const metadata = { title: 'Team Members' }

export default async function MembersPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const sessionUser = await getCurrentUser();
  const userId = sessionUser?.id;
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  // Bypassed onboarding redirect loop

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: {
      owner: { select: { id: true, fullName: true, email: true, profileImage: true, role: true } },
      members: {
        include: {
          user: { select: { id: true, fullName: true, email: true, profileImage: true, role: true } },
        },
      },
    },
  })

  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const isMember = house.members.some((m) => m.userId === user.id)
  if (!isOwner && !isMember && user.role !== 'ADMIN') redirect('/houses')

  return (
    <DashboardLayout houseId={houseId}>
      <MembersView
        houseId={houseId}
        houseName={house.projectName}
        owner={house.owner}
        members={house.members}
        canManage={isOwner || user.role === 'ADMIN'}
        currentUserId={user.id}
      />
    </DashboardLayout>
  )
}
