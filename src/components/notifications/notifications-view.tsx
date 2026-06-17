'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import { Bell, CheckCheck } from 'lucide-react'

interface NotificationsViewProps {
  notifications: any[]
  unreadCount: number
}

export function NotificationsView({ notifications: initialNotifications, unreadCount: initialUnread }: NotificationsViewProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnread)
  const [markingAll, setMarkingAll] = useState(false)

  async function markAsRead(id: string) {
    const notif = notifications.find((n) => n.id === id)
    if (!notif || notif.read) return

    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))

    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications?action=mark-all-read', { method: 'PUT' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={markAllRead}
            loading={markingAll}
          >
            Mark All Read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! Notifications appear here when there's activity on your projects."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              padding="sm"
              hover
              className={!notif.read ? 'ring-1 ring-blue-200 dark:ring-blue-800' : ''}
            >
              <button
                className="w-full text-left"
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notif.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-zinc-100 font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                  </div>
                  {!notif.read && <Badge variant="info">New</Badge>}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
