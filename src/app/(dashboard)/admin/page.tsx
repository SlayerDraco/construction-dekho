import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Building2, Users, Wrench, AlertTriangle, FileText, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Admin' }

export default async function AdminPage() {
  const [
    userCount, houseCount, providerCount,
    alertCount, claimCount, recentUsers, recentHouses
  ] = await Promise.all([
    prisma.user.count(),
    prisma.house.count({ where: { projectStatus: { not: 'ARCHIVED' } } }),
    prisma.serviceProvider.count({ where: { active: true } }),
    prisma.houseAlert.count({ where: { acknowledged: false } }),
    prisma.claimRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.house.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { owner: { select: { fullName: true } }, houseType: true },
    }),
  ])

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Platform overview and management" />

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Users" value={userCount} icon={Users} />
          <StatCard label="Houses" value={houseCount} icon={Building2} />
          <StatCard label="Providers" value={providerCount} icon={Wrench} />
          <StatCard label="Active Alerts" value={alertCount} icon={AlertTriangle} />
          <StatCard label="Pending Claims" value={claimCount} icon={FileText} />
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/users', label: 'Manage Users', icon: Users },
            { href: '/admin/houses', label: 'Manage Houses', icon: Building2 },
            { href: '/admin/providers', label: 'Manage Providers', icon: Wrench },
            { href: '/admin/claims', label: `Claims (${claimCount})`, icon: FileText },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Card hover padding="sm" className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.label}</span>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent users */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Users</h2>
              <Link href="/admin/users" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentUsers.map((user) => (
                <Card key={user.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      {user.fullName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.fullName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent houses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Houses</h2>
              <Link href="/admin/houses" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {recentHouses.map((house) => (
                <Card key={house.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{house.projectName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {house.owner?.fullName} · {house.city} · {formatDate(house.createdAt)}
                      </p>
                    </div>
                    <Badge variant={house.projectStatus === 'ACTIVE' ? 'info' : 'outline'}>
                      {house.projectStatus}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
