'use client'

import Link from 'next/link'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { ProgressBar, Badge, EmptyState, AlertBanner } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import {
  Building2, AlertTriangle, CheckSquare, DollarSign,
  ArrowRight, Plus, Clock, TrendingUp, Flag, ChevronRight
} from 'lucide-react'

interface DashboardContentProps {
  user: { id: string; fullName: string; role: string }
  houses: any[]
  notifications: any[]
}

function StageStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'outline' }> = {
    COMPLETED: { label: 'Complete', variant: 'success' },
    COMPLETED_WITH_WARNINGS: { label: 'With Warnings', variant: 'warning' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    NOT_STARTED: { label: 'Not Started', variant: 'outline' },
  }
  const c = config[status] ?? config.NOT_STARTED
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function AlertSeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: 'danger' | 'warning' | 'info' | 'outline' }> = {
    CRITICAL: { variant: 'danger' },
    HIGH: { variant: 'danger' },
    MEDIUM: { variant: 'warning' },
    LOW: { variant: 'info' },
  }
  return <Badge variant={config[severity]?.variant ?? 'outline'}>{severity}</Badge>
}

function HouseCard({ house }: { house: any }) {
  const currentStage = house.houseStages.find((hs: any) =>
    hs.status === 'IN_PROGRESS'
  ) ?? house.houseStages.find((hs: any) => hs.status === 'NOT_STARTED')

  const completedStages = house.houseStages.filter((hs: any) => hs.status === 'COMPLETED' || hs.status === 'COMPLETED_WITH_WARNINGS').length
  const totalExpenses = house.expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
  const alertCount = house.houseAlerts.length
  const pendingDecisions = house.houseDecisions.filter((hd: any) => !hd.completedAt).length

  return (
    <Card hover className="group">
      <Link href={`/houses/${house.id}`} className="block">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
              {house.projectName}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {house.city}, {house.state} · {house.houseType?.name}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
        </div>

        <div className="mb-4">
          <ProgressBar value={house.currentProgress} showLabel size="sm" />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {completedStages} of {house.houseStages.length} stages complete
            </span>
            {currentStage && (
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {currentStage.stage.name}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {alertCount > 0 ? (
                <span className="text-red-600 dark:text-red-400">{alertCount}</span>
              ) : '0'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Alerts</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {pendingDecisions > 0 ? (
                <span className="text-yellow-600 dark:text-yellow-400">{pendingDecisions}</span>
              ) : '0'}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Decisions</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Spent</p>
          </div>
        </div>
      </Link>
    </Card>
  )
}

export function DashboardContent({ user, houses, notifications }: DashboardContentProps) {
  const totalAlerts = houses.reduce((sum, h) => sum + h.houseAlerts.length, 0)
  const totalPendingDecisions = houses.reduce(
    (sum, h) => sum + h.houseDecisions.filter((hd: any) => !hd.completedAt).length, 0
  )
  const totalExpenses = houses.reduce(
    (sum, h) => sum + h.expenses.reduce((s: number, e: any) => s + e.amount, 0), 0
  )

  const recentUpdates = houses
    .flatMap((h) => h.progressUpdates.map((u: any) => ({ ...u, houseName: h.projectName, houseId: h.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const recentAlerts = houses
    .flatMap((h) => h.houseAlerts.map((a: any) => ({ ...a, houseName: h.projectName, houseId: h.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  const upcomingDecisions = houses
    .flatMap((h) =>
      h.houseDecisions
        .filter((hd: any) => !hd.completedAt)
        .map((hd: any) => ({ ...hd, houseName: h.projectName, houseId: h.id }))
    )
    .slice(0, 4)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="px-6 py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Good morning, {user.fullName.split(' ')[0]}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {houses.length === 0
                ? 'Get started by creating your first project.'
                : `You have ${houses.length} active project${houses.length !== 1 ? 's' : ''}.`}
            </p>
          </div>
          <Link href="/houses/new">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
              New House
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Critical alerts banner */}
        {totalAlerts > 0 && (
          <AlertBanner
            variant="warning"
            title={`${totalAlerts} active alert${totalAlerts !== 1 ? 's' : ''} need your attention`}
            description="Review alerts in your project dashboards to keep construction on track."
            action={
              houses.length === 1 ? (
                <Link href={`/houses/${houses[0].id}/alerts`}>
                  <Button variant="outline" size="sm">View Alerts</Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Projects</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{houses.length}</p>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Alerts</span>
            </div>
            <p className={`text-2xl font-bold ${totalAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {totalAlerts}
            </p>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Decisions</span>
            </div>
            <p className={`text-2xl font-bold ${totalPendingDecisions > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
              {totalPendingDecisions}
            </p>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalExpenses)}</p>
          </Card>
        </div>

        {/* Houses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your Projects</h2>
            <Link href="/houses" className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {houses.length === 0 ? (
            <Card>
              <EmptyState
                icon={Building2}
                title="No projects yet"
                description="Create your first house project to start tracking your construction journey."
                action={
                  <Link href="/houses/new">
                    <Button leftIcon={<Plus className="h-4 w-4" />}>Create Project</Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {houses.map((house) => (
                <HouseCard key={house.id} house={house} />
              ))}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Recent Alerts
              </h2>
            </div>
            {recentAlerts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={AlertTriangle}
                  title="No active alerts"
                  description="Everything looks good across your projects."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => (
                  <Card key={alert.id} padding="sm" hover>
                    <Link href={`/houses/${alert.houseId}/alerts`} className="block">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <AlertSeverityBadge severity={alert.alert.severity} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {alert.alert.title}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {alert.houseName} · {formatRelativeTime(alert.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Decisions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-blue-500" />
                Upcoming Decisions
              </h2>
            </div>
            {upcomingDecisions.length === 0 ? (
              <Card>
                <EmptyState
                  icon={CheckSquare}
                  title="No pending decisions"
                  description="All current decisions have been made."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingDecisions.map((hd) => (
                  <Card key={hd.id} padding="sm" hover>
                    <Link href={`/houses/${hd.houseId}/roadmap`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {hd.decision.title}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {hd.houseName} · {hd.decision.stage?.name}
                          </p>
                        </div>
                        {hd.decision.required && (
                          <Badge variant="warning" className="ml-2 shrink-0">Required</Badge>
                        )}
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Recent Updates */}
        {recentUpdates.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-zinc-400" />
                Recent Updates
              </h2>
            </div>
            <div className="space-y-2">
              {recentUpdates.map((update) => (
                <Card key={update.id} padding="sm" hover>
                  <Link href={`/houses/${update.houseId}/progress`} className="block">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{update.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {update.houseName} · {update.submitter?.fullName} · {formatRelativeTime(update.createdAt)}
                        </p>
                      </div>
                      {update.media?.length > 0 && (
                        <Badge variant="outline">{update.media.length} media</Badge>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
