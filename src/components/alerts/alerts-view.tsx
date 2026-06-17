'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import {
  AlertTriangle, Check, RefreshCw, AlertCircle,
  Link2, CheckSquare, DollarSign, TrendingUp, Cloud, Info
} from 'lucide-react'

const ALERT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DEPENDENCY: Link2,
  DECISION: CheckSquare,
  WARNING: AlertTriangle,
  BUDGET: DollarSign,
  PROGRESS: TrendingUp,
  WEATHER: Cloud,
}

const SEVERITY_CONFIG: Record<string, { variant: 'danger' | 'warning' | 'info' | 'outline'; label: string }> = {
  CRITICAL: { variant: 'danger', label: 'Critical' },
  HIGH: { variant: 'danger', label: 'High' },
  MEDIUM: { variant: 'warning', label: 'Medium' },
  LOW: { variant: 'info', label: 'Low' },
}

interface AlertsViewProps {
  houseId: string
  houseName: string
  alerts: any[]
  weatherAlerts: any[]
  canAcknowledge: boolean
}

export function AlertsView({ houseId, houseName, alerts: initialAlerts, weatherAlerts, canAcknowledge }: AlertsViewProps) {
  const router = useRouter()
  const [alerts, setAlerts] = useState(initialAlerts)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('active')

  const activeAlerts = alerts.filter((a) => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter((a) => a.acknowledged)

  const displayed = filter === 'all' ? alerts : filter === 'active' ? activeAlerts : acknowledgedAlerts

  async function handleAcknowledge(houseAlertId: string) {
    setAcknowledging(houseAlertId)
    try {
      const res = await fetch(`/api/houses/${houseId}/alerts?action=acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseAlertId }),
      })
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === houseAlertId ? { ...a, acknowledged: true } : a))
        )
        toast.success('Alert acknowledged')
      } else {
        toast.error('Failed to acknowledge alert')
      }
    } finally {
      setAcknowledging(null)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/alerts?action=refresh`, { method: 'POST' })
      if (res.ok) {
        toast.success('Alerts refreshed')
        router.refresh()
      } else {
        toast.error('Failed to refresh alerts')
      }
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        description={`${houseName} · ${activeAlerts.length} active`}
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            Refresh
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
          {(['active', 'all', 'acknowledged'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {f === 'active' ? `Active (${activeAlerts.length})` : f === 'acknowledged' ? `Done (${acknowledgedAlerts.length})` : `All (${alerts.length})`}
            </button>
          ))}
        </div>

        {/* Alert list */}
        {displayed.length === 0 ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              title={filter === 'active' ? 'No active alerts' : 'No alerts'}
              description={
                filter === 'active'
                  ? 'Everything looks good. Alerts are auto-generated as your project progresses.'
                  : 'Alerts are generated automatically based on your project status.'
              }
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {displayed.map((houseAlert) => {
              const alert = houseAlert.alert
              const Icon = ALERT_TYPE_ICONS[alert.type] ?? AlertCircle
              const sevConfig = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.MEDIUM
              return (
                <Card
                  key={houseAlert.id}
                  padding="sm"
                  className={houseAlert.acknowledged ? 'opacity-60' : ''}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : alert.severity === 'MEDIUM'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
                          ? 'text-red-600 dark:text-red-400'
                          : alert.severity === 'MEDIUM'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {alert.title}
                          </p>
                          <Badge variant={sevConfig.variant}>{sevConfig.label}</Badge>
                          <Badge variant="outline">{alert.type}</Badge>
                        </div>
                        {houseAlert.acknowledged && (
                          <Badge variant="success"><Check className="h-3 w-3 mr-0.5" />Done</Badge>
                        )}
                      </div>

                      {alert.description && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{alert.description}</p>
                      )}

                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                        {formatRelativeTime(houseAlert.createdAt)}
                      </p>

                      {canAcknowledge && !houseAlert.acknowledged && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Check className="h-3.5 w-3.5" />}
                            onClick={() => handleAcknowledge(houseAlert.id)}
                            loading={acknowledging === houseAlert.id}
                          >
                            Acknowledge
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Weather alerts */}
        {weatherAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
              <Cloud className="h-4 w-4 text-blue-500" />
              Weather Alerts
            </h2>
            <div className="space-y-2">
              {weatherAlerts.map((wa) => (
                <Card key={wa.id} padding="sm">
                  <div className="flex items-center gap-3">
                    <Cloud className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">{wa.alertMessage}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {formatRelativeTime(wa.createdAt)}
                      </p>
                    </div>
                    <Badge variant={wa.severity === 'HIGH' || wa.severity === 'CRITICAL' ? 'danger' : 'info'}>
                      {wa.severity}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            All alerts are automatically generated based on your project's dependencies, decisions, budget, and progress. 
            Click "Refresh" to re-evaluate current conditions.
          </p>
        </div>
      </div>
    </div>
  )
}
