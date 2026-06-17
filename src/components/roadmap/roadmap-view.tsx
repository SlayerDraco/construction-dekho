'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, ProgressBar, Modal, AlertBanner, EmptyState } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  ChevronDown, ChevronRight, CheckCircle, Circle, AlertTriangle,
  Lock, SkipForward, Zap, DollarSign, ClipboardList, Info
} from 'lucide-react'

interface RoadmapViewProps {
  house: any
  currentUserId: string
  canEdit: boolean
}

function TaskTypeLabel({ type }: { type: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'info' | 'outline' }> = {
    MANDATORY: { label: 'Required', variant: 'success' },
    RECOMMENDED: { label: 'Recommended', variant: 'info' },
    OPTIONAL: { label: 'Optional', variant: 'outline' },
  }
  const c = config[type] ?? config.OPTIONAL
  return <Badge variant={c.variant}>{c.label}</Badge>
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
  if (status === 'SKIPPED') return <SkipForward className="h-4 w-4 text-zinc-400 shrink-0" />
  if (status === 'BLOCKED') return <Lock className="h-4 w-4 text-red-400 shrink-0" />
  if (status === 'IN_PROGRESS') return <div className="h-4 w-4 rounded-full border-2 border-blue-500 shrink-0" />
  return <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600 shrink-0" />
}

function StageStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'outline' | 'danger' }> = {
    COMPLETED: { label: 'Completed', variant: 'success' },
    COMPLETED_WITH_WARNINGS: { label: 'Completed with Warnings', variant: 'warning' },
    IN_PROGRESS: { label: 'In Progress', variant: 'info' },
    NOT_STARTED: { label: 'Not Started', variant: 'outline' },
  }
  const c = config[status] ?? config.NOT_STARTED
  return <Badge variant={c.variant}>{c.label}</Badge>
}

interface StageCardProps {
  houseStage: any
  houseTasks: any[]
  houseDecisions: any[]
  houseId: string
  canEdit: boolean
  onUpdate: () => void
}

function StageCard({ houseStage, houseTasks, houseDecisions, houseId, canEdit, onUpdate }: StageCardProps) {
  const [expanded, setExpanded] = useState(houseStage.status === 'IN_PROGRESS')
  const [completing, setCompleting] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completionCheck, setCompletionCheck] = useState<any>(null)
  const [updatingTask, setUpdatingTask] = useState<string | null>(null)
  const [decisionInput, setDecisionInput] = useState<Record<string, string>>({})
  const [savingDecision, setSavingDecision] = useState<string | null>(null)

  const stage = houseStage.stage
  const stageTasks = stage.tasks.map((t: any) => ({
    ...t,
    houseTask: houseTasks.find((ht: any) => ht.taskId === t.id),
  }))
  const stageDecisions = stage.decisions.map((d: any) => ({
    ...d,
    houseDecision: houseDecisions.find((hd: any) => hd.decisionId === d.id),
  }))

  const completedTasks = stageTasks.filter((t: any) =>
    t.houseTask?.status === 'COMPLETED' || t.houseTask?.status === 'SKIPPED'
  ).length
  const totalTasks = stageTasks.length
  const stageProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const pendingDecisions = stageDecisions.filter((d: any) => !d.houseDecision?.completedAt)

  const canComplete = houseStage.status !== 'COMPLETED' && houseStage.status !== 'COMPLETED_WITH_WARNINGS'

  async function handleTaskToggle(taskId: string, currentStatus: string) {
    if (!canEdit) return
    setUpdatingTask(taskId)
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
      const res = await fetch(`/api/houses/${houseId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: newStatus }),
      })
      if (res.ok) {
        onUpdate()
      } else {
        toast.error('Failed to update task')
      }
    } finally {
      setUpdatingTask(null)
    }
  }

  async function initiateComplete() {
    const res = await fetch(`/api/houses/${houseId}/stages?stageId=${stage.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceComplete: false }),
    })
    const data = await res.json()
    if (data.canComplete === false) {
      setCompletionCheck(data)
      setShowCompleteModal(true)
    } else if (data.success) {
      toast.success(`${stage.name} completed!`)
      onUpdate()
    } else {
      toast.error(data.message ?? 'Failed to complete stage')
    }
  }

  async function forceComplete() {
    setCompleting(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/stages?stageId=${stage.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceComplete: true }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          data.status === 'COMPLETED_WITH_WARNINGS'
            ? `${stage.name} completed with warnings — ${data.skippedTasks.length} tasks skipped`
            : `${stage.name} completed!`
        )
        setShowCompleteModal(false)
        onUpdate()
      } else {
        toast.error('Failed to complete stage')
      }
    } finally {
      setCompleting(false)
    }
  }

  async function saveDecision(decisionId: string) {
    const value = decisionInput[decisionId]
    if (!value?.trim()) return
    setSavingDecision(decisionId)
    try {
      const res = await fetch(`/api/houses/${houseId}/decisions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionId, selectedValue: value }),
      })
      if (res.ok) {
        toast.success('Decision saved')
        setDecisionInput((d) => ({ ...d, [decisionId]: '' }))
        onUpdate()
      } else {
        toast.error('Failed to save decision')
      }
    } finally {
      setSavingDecision(null)
    }
  }

  const isLocked = houseStage.status === 'COMPLETED' || houseStage.status === 'COMPLETED_WITH_WARNINGS'

  return (
    <>
      <Card
        padding="none"
        className={`overflow-hidden transition-all ${
          houseStage.status === 'IN_PROGRESS'
            ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20'
            : ''
        }`}
      >
        {/* Stage header */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
            isLocked
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : houseStage.status === 'IN_PROGRESS'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}>
            {isLocked ? '✓' : stage.displayOrder}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{stage.name}</span>
              <StageStatusBadge status={houseStage.status} />
              {pendingDecisions.length > 0 && (
                <Badge variant="warning">{pendingDecisions.length} decision{pendingDecisions.length !== 1 ? 's' : ''} pending</Badge>
              )}
            </div>
            {houseStage.status !== 'NOT_STARTED' && (
              <div className="mt-1.5 flex items-center gap-3">
                <ProgressBar value={stageProgress} size="sm" className="w-32" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{completedTasks}/{totalTasks} tasks</span>
              </div>
            )}
          </div>

          {expanded
            ? <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
          }
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t border-zinc-100 dark:border-zinc-800">
            {stage.description && (
              <p className="px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/30">
                {stage.description}
              </p>
            )}

            {/* Tasks */}
            {stageTasks.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Hidden Tasks
                </p>
                <div className="space-y-2">
                  {stageTasks.map((task: any) => {
                    const status = task.houseTask?.status ?? 'PENDING'
                    const isCompleted = status === 'COMPLETED'
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          isCompleted
                            ? 'bg-green-50 dark:bg-green-900/10'
                            : status === 'BLOCKED'
                            ? 'bg-red-50 dark:bg-red-900/10'
                            : 'bg-zinc-50 dark:bg-zinc-800/50'
                        }`}
                      >
                        <button
                          onClick={() => handleTaskToggle(task.id, status)}
                          disabled={!canEdit || updatingTask === task.id || status === 'BLOCKED' || status === 'SKIPPED'}
                          className="mt-0.5 disabled:opacity-50"
                        >
                          {updatingTask === task.id ? (
                            <div className="h-4 w-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                          ) : (
                            <TaskStatusIcon status={status} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${
                              isCompleted
                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {task.name}
                            </span>
                            <TaskTypeLabel type={task.taskType} />
                          </div>
                          {task.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{task.description}</p>
                          )}
                          {task.houseTask?.notes && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 italic">
                              Note: {task.houseTask.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Decisions */}
            {stageDecisions.length > 0 && (
              <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Decisions
                </p>
                <div className="space-y-3">
                  {stageDecisions.map((decision: any) => {
                    const completed = !!decision.houseDecision?.completedAt
                    return (
                      <div key={decision.id} className={`p-3 rounded-lg border ${
                        completed
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                          : decision.required
                          ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              {decision.title}
                            </span>
                            {decision.required && !completed && (
                              <Badge variant="warning" className="ml-2">Required</Badge>
                            )}
                          </div>
                          {completed && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                        </div>
                        {decision.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{decision.description}</p>
                        )}
                        {completed ? (
                          <p className="text-xs font-medium text-green-700 dark:text-green-400">
                            ✓ {decision.houseDecision.selectedValue}
                          </p>
                        ) : canEdit ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Enter your decision..."
                              value={decisionInput[decision.id] ?? ''}
                              onChange={(e) => setDecisionInput((d) => ({ ...d, [decision.id]: e.target.value }))}
                              className="flex-1 h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-300"
                            />
                            <Button
                              size="sm"
                              onClick={() => saveDecision(decision.id)}
                              loading={savingDecision === decision.id}
                              disabled={!decisionInput[decision.id]?.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">No decision made yet</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cost estimates */}
            {stage.costEstimates?.length > 0 && (
              <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Cost Intelligence
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stage.costEstimates.map((est: any) => (
                    <div key={est.id} className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{est.category}</span>
                        <Badge variant={
                          est.confidence === 'HIGH' ? 'success'
                          : est.confidence === 'MEDIUM' ? 'info'
                          : 'outline'
                        }>
                          {est.confidence}
                        </Badge>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(est.minCost)} – {formatCurrency(est.maxCost)}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{est.city} · {est.sourceCount} data points</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  These are guidance ranges, not exact quotes. Get multiple quotes from local contractors.
                </p>
              </div>
            )}

            {/* Stage actions */}
            {canEdit && canComplete && (
              <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initiateComplete}
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                >
                  Mark Stage Complete
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Stage completion modal */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Incomplete Tasks Detected"
        description="Some tasks in this stage are not yet complete."
      >
        {completionCheck && (
          <div className="space-y-4">
            {completionCheck.mandatoryIncomplete?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  Mandatory tasks not complete ({completionCheck.mandatoryIncomplete.length}):
                </p>
                <ul className="space-y-1">
                  {completionCheck.mandatoryIncomplete.map((t: string) => (
                    <li key={t} className="text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <AlertBanner
              variant="warning"
              title="Proceeding will mark these tasks as Skipped"
              description="The stage will be marked 'Completed with Warnings'. You can always go back and complete these tasks later."
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                Go Back
              </Button>
              <Button variant="destructive" onClick={forceComplete} loading={completing}>
                Continue Anyway
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

export function RoadmapView({ house, currentUserId, canEdit }: RoadmapViewProps) {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const taskMap = new Map(house.houseTasks.map((ht: any) => [ht.taskId, ht]))
  const decisionMap = new Map(house.houseDecisions.map((hd: any) => [hd.decisionId, hd]))

  const currentStage = house.houseStages.find((hs: any) => hs.status === 'IN_PROGRESS')
    ?? house.houseStages.find((hs: any) => hs.status === 'NOT_STARTED')

  function handleUpdate() {
    router.refresh()
  }

  return (
    <div>
      <PageHeader
        title="Construction Roadmap"
        description={`${house.houseStages.filter((hs: any) => hs.status === 'COMPLETED' || hs.status === 'COMPLETED_WITH_WARNINGS').length} of ${house.houseStages.length} stages complete`}
      />

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-3">
        {/* Current stage callout */}
        {currentStage && (
          <AlertBanner
            variant="info"
            title={`Current: ${currentStage.stage.name}`}
            description={`Stage ${currentStage.stage.displayOrder} of ${house.houseStages.length} — click to expand and manage tasks`}
          />
        )}

        {/* Active features */}
        {house.houseFeatures.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              Active features:
            </span>
            {house.houseFeatures.map((hf: any) => (
              <Badge key={hf.id} variant="info">{hf.feature.name}</Badge>
            ))}
          </div>
        )}

        {/* Stage list */}
        {house.houseStages.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardList}
              title="Roadmap not initialized"
              description="Your construction roadmap hasn't been set up yet. Please contact support."
            />
          </Card>
        ) : (
          house.houseStages.map((houseStage: any) => (
            <StageCard
              key={houseStage.id}
              houseStage={houseStage}
              houseTasks={house.houseTasks}
              houseDecisions={house.houseDecisions}
              houseId={house.id}
              canEdit={canEdit}
              onUpdate={handleUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}
