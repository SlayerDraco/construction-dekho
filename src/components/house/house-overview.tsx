'use client'

import Link from 'next/link'
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge, ProgressBar, EmptyState, AlertBanner } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import {
  Map, CheckSquare, DollarSign, FileText, AlertTriangle,
  TrendingUp, Users, Flag, Clock, Zap, ChevronRight,
  Building2, Calendar
} from 'lucide-react'
import { PageHeader } from '@/components/layout/dashboard-layout'

interface HouseOverviewProps {
  house: any
  currentUser: any
}

function QuickNavCard({ href, icon: Icon, label, count, countVariant }: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  countVariant?: 'danger' | 'warning' | 'info'
}) {
  return (
    <Link href={href}>
      <Card hover padding="sm" className="group">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
            <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
          {count !== undefined && count > 0 && (
            <Badge variant={countVariant ?? 'outline'}>{count}</Badge>
          )}
          <ChevronRight className="h-4 w-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
        </div>
      </Card>
    </Link>
  )
}

export function HouseOverview({ house, currentUser }: HouseOverviewProps) {
  const currentStage = house.houseStages.find(
    (hs: any) => hs.status === 'IN_PROGRESS'
  ) ?? house.houseStages.find((hs: any) => hs.status === 'NOT_STARTED')

  const nextStage = (() => {
    if (!currentStage) return null
    const curr = house.houseStages.find((hs: any) => hs.id === currentStage.id)
    const currOrder = curr?.stage?.displayOrder ?? 0
    return house.houseStages.find((hs: any) => hs.stage?.displayOrder === currOrder + 1)
  })()

  const completedStages = house.houseStages.filter(
    (hs: any) => hs.status === 'COMPLETED' || hs.status === 'COMPLETED_WITH_WARNINGS'
  ).length

  const totalExpenses = house.expenses.reduce((s: number, e: any) => s + e.amount, 0)
  const alertCount = house.houseAlerts.length
  const pendingDecisions = house.houseDecisions.length
  const activeFeatures = house.houseFeatures.length

  const isOwner = house.ownerId === currentUser.id

  return (
    <div>
      <PageHeader
        title={house.projectName}
        description={`${house.city}, ${house.state} · ${house.houseType?.name}`}
        action={
          isOwner && (
            <Link href={`/houses/${house.id}/settings`}>
              <Button variant="outline" size="sm">Settings</Button>
            </Link>
          )
        }
      />

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Critical alerts */}
        {alertCount > 0 && (
          <AlertBanner
            variant="warning"
            title={`${alertCount} active alert${alertCount !== 1 ? 's' : ''}`}
            description={house.houseAlerts[0]?.alert?.title}
            action={
              <Link href={`/houses/${house.id}/alerts`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            }
          />
        )}

        {/* Progress overview */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <CardTitle>Project Progress</CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {completedStages} of {house.houseStages.length} stages complete
              </p>
            </div>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {Math.round(house.currentProgress)}%
            </span>
          </div>

          <ProgressBar value={house.currentProgress} size="lg" showLabel={false} className="mb-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Current Stage</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {currentStage?.stage?.name ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Next Stage</p>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {nextStage?.stage?.name ?? 'Final stage'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Total Spent</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-0.5">Started</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatDate(house.createdAt)}</p>
            </div>
          </div>
        </Card>

        {/* Milestones */}
        {house.houseMilestones.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-yellow-500" />
              Milestones Achieved
            </h2>
            <div className="flex flex-wrap gap-2">
              {house.houseMilestones.map((hm: any) => (
                <Badge key={hm.id} variant="success">
                  🎉 {hm.milestone.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Quick navigation */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <QuickNavCard href={`/houses/${house.id}/roadmap`} icon={Map} label="Construction Roadmap" />
            <QuickNavCard href={`/houses/${house.id}/alerts`} icon={AlertTriangle} label="Active Alerts" count={alertCount} countVariant="danger" />
            <QuickNavCard href={`/houses/${house.id}/roadmap`} icon={CheckSquare} label="Pending Decisions" count={pendingDecisions} countVariant="warning" />
            <QuickNavCard href={`/houses/${house.id}/budget`} icon={DollarSign} label="Budget & Expenses" />
            <QuickNavCard href={`/houses/${house.id}/documents`} icon={FileText} label="Document Vault" count={house._count?.documents} />
            <QuickNavCard href={`/houses/${house.id}/progress`} icon={TrendingUp} label="Progress Updates" count={house._count?.progressUpdates} />
            <QuickNavCard href={`/houses/${house.id}/members`} icon={Users} label="Team Members" count={house._count?.members} />
            <QuickNavCard href={`/providers?city=${encodeURIComponent(house.city)}`} icon={Zap} label="Find Service Providers" />
          </div>
        </div>

        {/* Recent updates */}
        {house.progressUpdates.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-zinc-400" />
                Recent Updates
              </h2>
              <Link href={`/houses/${house.id}/progress`} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {house.progressUpdates.map((update: any) => (
                <Card key={update.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-500">
                      {update.submitter?.fullName?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{update.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {update.submitter?.fullName} · {formatRelativeTime(update.createdAt)}
                      </p>
                    </div>
                    {update.verification && (
                      <Badge variant={update.verification.approved ? 'success' : 'danger'}>
                        {update.verification.approved ? 'Approved' : 'Rejected'}
                      </Badge>
                    )}
                    {update.media?.length > 0 && (
                      <Badge variant="outline">{update.media.length} media</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Active features */}
        {activeFeatures > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-blue-500" />
              Active Features ({activeFeatures})
            </h2>
            <div className="flex flex-wrap gap-2">
              {house.houseFeatures.map((hf: any) => (
                <Badge key={hf.id} variant="info">{hf.feature.name}</Badge>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
