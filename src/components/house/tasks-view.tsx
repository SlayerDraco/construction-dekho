'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, ProgressBar, EmptyState, Textarea } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { CheckSquare, CheckCircle, Circle, Lock, SkipForward, Clock, Search } from 'lucide-react'

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; variant: 'success' | 'info' | 'danger' | 'warning' | 'outline' }> = {
  COMPLETED: { icon: CheckCircle, label: 'Completed', variant: 'success' },
  IN_PROGRESS: { icon: Clock, label: 'In Progress', variant: 'info' },
  BLOCKED: { icon: Lock, label: 'Blocked', variant: 'danger' },
  SKIPPED: { icon: SkipForward, label: 'Skipped', variant: 'warning' },
  PENDING: { icon: Circle, label: 'Pending', variant: 'outline' },
}

const TYPE_VARIANT: Record<string, 'success' | 'info' | 'outline'> = {
  MANDATORY: 'success',
  RECOMMENDED: 'info',
  OPTIONAL: 'outline',
}

interface TasksViewProps {
  houseId: string
  houseName: string
  houseTasks: any[]
  canEdit: boolean
  progress: number
}

export function TasksView({ houseId, houseName, houseTasks: initialTasks, canEdit, progress }: TasksViewProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initialTasks)
  const [updating, setUpdating] = useState<string | null>(null)
  const [notesModal, setNotesModal] = useState<{ taskId: string; currentNotes: string } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch] = useState('')

  const stages = [...new Set(tasks.map((t) => t.task.stage.name))].sort(
    (a, b) => {
      const ao = tasks.find((t) => t.task.stage.name === a)?.task.stage.displayOrder ?? 0
      const bo = tasks.find((t) => t.task.stage.name === b)?.task.stage.displayOrder ?? 0
      return ao - bo
    }
  )

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterStage !== 'all' && t.task.stage.name !== filterStage) return false
    if (filterType !== 'all' && t.task.taskType !== filterType) return false
    if (search && !t.task.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length
  const totalCount = tasks.length

  async function updateTaskStatus(taskId: string, status: string) {
    if (!canEdit) return
    setUpdating(taskId)
    try {
      const res = await fetch(`/api/houses/${houseId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      })
      if (res.ok) {
        const data = await res.json()
        setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status } : t))
        toast.success(`Task marked as ${status.toLowerCase().replace('_', ' ')}`)
      } else {
        toast.error('Failed to update task')
      }
    } finally {
      setUpdating(null)
    }
  }

  async function saveNote(taskId: string, notes: string) {
    setSavingNote(true)
    try {
      const task = tasks.find((t) => t.taskId === taskId)
      const res = await fetch(`/api/houses/${houseId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: task?.status ?? 'PENDING', notes }),
      })
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, notes } : t))
        setNotesModal(null)
        toast.success('Note saved')
      } else {
        toast.error('Failed to save note')
      }
    } finally {
      setSavingNote(false)
    }
  }

  const grouped = stages.map((stageName) => ({
    stageName,
    tasks: filtered.filter((t) => t.task.stage.name === stageName),
  })).filter((g) => g.tasks.length > 0)

  return (
    <div>
      <PageHeader
        title="All Tasks"
        description={`${houseName} · ${completedCount}/${totalCount} complete`}
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {/* Progress summary */}
        <Card padding="sm">
          <ProgressBar value={progress} showLabel size="md" />
          <div className="flex justify-between mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{completedCount} tasks complete</span>
            <span>{totalCount - completedCount} remaining</span>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-300"
            />
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1 flex-wrap">
            {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'SKIPPED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterStatus === s
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Stage filter pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterStage('all')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStage === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
            }`}
          >
            All Stages
          </button>
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                filterStage === s
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Task list */}
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={CheckSquare}
              title="No tasks match filters"
              description="Try clearing some filters to see more tasks."
            />
          </Card>
        ) : (
          grouped.map(({ stageName, tasks: stageTasks }) => (
            <div key={stageName}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{stageName}</p>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {stageTasks.filter((t) => t.status === 'COMPLETED').length}/{stageTasks.length}
                </span>
              </div>

              <div className="space-y-1.5">
                {stageTasks.map((ht) => {
                  const cfg = STATUS_CONFIG[ht.status] ?? STATUS_CONFIG.PENDING
                  const Icon = cfg.icon
                  const isCompleted = ht.status === 'COMPLETED'
                  const isBlocked = ht.status === 'BLOCKED'

                  return (
                    <Card
                      key={ht.id}
                      padding="sm"
                      className={`transition-colors ${
                        isCompleted ? 'bg-green-50 dark:bg-green-900/10' :
                        isBlocked ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status toggle button */}
                        {canEdit && !isBlocked && ht.status !== 'SKIPPED' ? (
                          <button
                            onClick={() => updateTaskStatus(
                              ht.taskId,
                              ht.status === 'COMPLETED' ? 'PENDING' :
                              ht.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS'
                            )}
                            disabled={updating === ht.taskId}
                            className="mt-0.5 shrink-0"
                          >
                            {updating === ht.taskId ? (
                              <div className="h-4 w-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                            ) : (
                              <Icon className={`h-4 w-4 ${
                                isCompleted ? 'text-green-500' :
                                ht.status === 'IN_PROGRESS' ? 'text-blue-500' :
                                'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500'
                              }`} />
                            )}
                          </button>
                        ) : (
                          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                            isCompleted ? 'text-green-500' :
                            isBlocked ? 'text-red-400' :
                            ht.status === 'SKIPPED' ? 'text-zinc-400' :
                            'text-zinc-300 dark:text-zinc-600'
                          }`} />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${
                              isCompleted
                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-800 dark:text-zinc-200'
                            }`}>
                              {ht.task.name}
                            </span>
                            <Badge variant={TYPE_VARIANT[ht.task.taskType]}>{ht.task.taskType}</Badge>
                            {ht.status !== 'PENDING' && (
                              <Badge variant={cfg.variant}>{cfg.label}</Badge>
                            )}
                          </div>
                          {ht.task.description && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{ht.task.description}</p>
                          )}
                          {ht.notes && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 italic">📝 {ht.notes}</p>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setNotesModal({ taskId: ht.taskId, currentNotes: ht.notes ?? '' }); setNoteText(ht.notes ?? '') }}
                              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              Note
                            </button>
                            {ht.status !== 'COMPLETED' && ht.status !== 'SKIPPED' && (
                              <button
                                onClick={() => updateTaskStatus(ht.taskId, 'SKIPPED')}
                                disabled={updating === ht.taskId}
                                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Skip
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notes modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setNotesModal(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Add Note</h3>
            <Textarea
              placeholder="Add a note about this task..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => saveNote(notesModal.taskId, noteText)} loading={savingNote}>
                Save Note
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNotesModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
