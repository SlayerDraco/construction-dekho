import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MembersView } from '@/components/house/members-view'

export const metadata = { title: 'Team Members' }

export default async function MembersPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

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
