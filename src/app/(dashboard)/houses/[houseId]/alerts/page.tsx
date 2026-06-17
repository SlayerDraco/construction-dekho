import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AlertsView } from '@/components/alerts/alerts-view'

export const metadata = { title: 'Alerts' }

export default async function AlertsPage({ params }: { params: Promise<{ houseId: string }> }) {
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

  const [alerts, weatherAlerts] = await Promise.all([
    prisma.houseAlert.findMany({
      where: { houseId },
      include: { alert: true },
      orderBy: [{ acknowledged: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.weatherAlert.findMany({
      where: { houseId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return (
    <DashboardLayout houseId={houseId}>
      <AlertsView
        houseId={houseId}
        houseName={house.projectName}
        alerts={alerts}
        weatherAlerts={weatherAlerts}
        canAcknowledge={isOwner || user.role === 'ADMIN'}
      />
    </DashboardLayout>
  )
}
