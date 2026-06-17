import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BudgetView } from '@/components/budget/budget-view'

export const metadata = { title: 'Budget' }

export default async function BudgetPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (!house) notFound()

  const isOwner = house.ownerId === user.id
  const isMember = await prisma.houseMember.findUnique({ where: { houseId_userId: { houseId, userId: user.id } } })
  if (!isOwner && !isMember && user.role !== 'ADMIN') redirect('/houses')

  const expenses = await prisma.expense.findMany({
    where: { houseId },
    orderBy: { createdAt: 'desc' },
  })

  const costEstimates = await prisma.costEstimate.findMany({
    where: { city: house.city },
    include: { stage: { select: { name: true, displayOrder: true } } },
    orderBy: { stage: { displayOrder: 'asc' } },
  })

  const canWrite = isOwner || user.role === 'ADMIN'

  return (
    <DashboardLayout houseId={houseId}>
      <BudgetView
        houseId={houseId}
        houseName={house.projectName}
        city={house.city}
        expenses={expenses}
        costEstimates={costEstimates}
        canWrite={canWrite}
      />
    </DashboardLayout>
  )
}
