import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { NotificationsView } from '@/components/notifications/notifications-view'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ])

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread`}
      />
      <NotificationsView notifications={notifications} unreadCount={unreadCount} />
    </div>
  )
}
