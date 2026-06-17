'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Select, Textarea } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/index'
import { formatCurrency, formatCurrencyFull, formatDate } from '@/lib/utils'
import { DollarSign, Plus, Trash2, Info, TrendingUp, BarChart2 } from 'lucide-react'

const EXPENSE_CATEGORIES = [
  { label: 'Electrical', value: 'ELECTRICAL' },
  { label: 'Plumbing', value: 'PLUMBING' },
  { label: 'Flooring', value: 'FLOORING' },
  { label: 'Painting', value: 'PAINTING' },
  { label: 'Labour', value: 'LABOUR' },
  { label: 'Materials', value: 'MATERIALS' },
  { label: 'Other', value: 'OTHER' },
]

const CATEGORY_COLORS: Record<string, string> = {
  ELECTRICAL: 'bg-yellow-500',
  PLUMBING: 'bg-blue-500',
  FLOORING: 'bg-orange-500',
  PAINTING: 'bg-purple-500',
  LABOUR: 'bg-green-500',
  MATERIALS: 'bg-zinc-500',
  OTHER: 'bg-pink-500',
}

interface BudgetViewProps {
  houseId: string
  houseName: string
  city: string
  expenses: any[]
  costEstimates: any[]
  canWrite: boolean
}

export function BudgetView({ houseId, houseName, city, expenses: initialExpenses, costEstimates, canWrite }: BudgetViewProps) {
  const router = useRouter()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    category: 'MATERIALS',
    amount: '',
    notes: '',
  })

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter((e) => e.category === cat.value).length,
  })).filter((c) => c.total > 0)

  async function handleSubmit() {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          amount: parseFloat(form.amount),
          notes: form.notes || undefined,
        }),
      })
      if (res.ok) {
        const expense = await res.json()
        setExpenses((prev) => [expense, ...prev])
        setForm({ category: 'MATERIALS', amount: '', notes: '' })
        setShowForm(false)
        toast.success('Expense added')
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to add expense')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/houses/${houseId}/budget?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        toast.success('Expense deleted')
      } else {
        toast.error('Failed to delete expense')
      }
    } finally {
      setDeleting(null)
    }
  }

  // Find relevant cost estimates for comparison
  const totalEstimateMin = costEstimates.reduce((s, e) => s + e.minCost, 0)
  const totalEstimateMax = costEstimates.reduce((s, e) => s + e.maxCost, 0)

  return (
    <div>
      <PageHeader
        title="Budget & Expenses"
        description={`${houseName} · ${city}`}
        action={
          canWrite && (
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              size="sm"
              onClick={() => setShowForm((v) => !v)}
            >
              Add Expense
            </Button>
          )
        }
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Add expense form */}
        {showForm && canWrite && (
          <Card>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Expense</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  options={EXPENSE_CATEGORIES}
                />
                <Input
                  label="Amount (₹)"
                  type="number"
                  placeholder="e.g., 25000"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <Textarea
                label="Notes (optional)"
                placeholder="e.g., Paid electrician for wiring work"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSubmit} loading={loading} size="sm">Add Expense</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(grandTotal)}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{formatCurrencyFull(grandTotal)}</p>
          </Card>
          <Card>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Estimated Range</p>
            {totalEstimateMin > 0 ? (
              <>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(totalEstimateMin)}–{formatCurrency(totalEstimateMax)}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Based on {city} estimates</p>
              </>
            ) : (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No estimates available for {city}</p>
            )}
          </Card>
          <Card>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Transactions</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{expenses.length}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">across {byCategory.length} categories</p>
          </Card>
        </div>

        {/* Cost comparison banner */}
        {grandTotal > 0 && totalEstimateMax > 0 && (
          <div className={`rounded-xl border p-4 ${
            grandTotal > totalEstimateMax * 1.1
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : grandTotal > totalEstimateMax
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {grandTotal > totalEstimateMax * 1.1
                    ? 'Spending significantly above estimate'
                    : grandTotal > totalEstimateMax
                    ? 'Spending slightly above estimate'
                    : grandTotal < totalEstimateMin * 0.5
                    ? 'Spending well below estimate'
                    : 'Spending within estimated range'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  You've spent {formatCurrency(grandTotal)} vs estimated {formatCurrency(totalEstimateMin)}–{formatCurrency(totalEstimateMax)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* By category breakdown */}
          <div className="md:col-span-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">By Category</h2>
            {byCategory.length === 0 ? (
              <Card>
                <EmptyState icon={BarChart2} title="No data yet" description="Add expenses to see the breakdown." />
              </Card>
            ) : (
              <Card padding="sm">
                <div className="space-y-3">
                  {byCategory.map((cat) => (
                    <div key={cat.value}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat.value]}`} />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{cat.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[cat.value]}`}
                          style={{ width: `${grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {grandTotal > 0 ? Math.round((cat.total / grandTotal) * 100) : 0}% · {cat.count} entries
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cost estimates */}
            {costEstimates.length > 0 && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Stage Estimates ({city})
                </h2>
                <div className="space-y-2">
                  {costEstimates.map((est) => (
                    <Card key={est.id} padding="sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{est.stage?.name}</p>
                        <Badge variant={
                          est.confidence === 'HIGH' ? 'success'
                          : est.confidence === 'MEDIUM' ? 'info' : 'outline'
                        }>{est.confidence}</Badge>
                      </div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(est.minCost)} – {formatCurrency(est.maxCost)}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{est.category}</p>
                    </Card>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Guidance ranges only. Get local quotes.
                </p>
              </div>
            )}
          </div>

          {/* Transaction list */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">All Transactions</h2>
            {expenses.length === 0 ? (
              <Card>
                <EmptyState
                  icon={DollarSign}
                  title="No expenses yet"
                  description="Start tracking your construction expenses to monitor your budget."
                  action={
                    canWrite && (
                      <Button
                        leftIcon={<Plus className="h-4 w-4" />}
                        size="sm"
                        onClick={() => setShowForm(true)}
                      >
                        Add First Expense
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {expenses.map((expense) => {
                  const cat = EXPENSE_CATEGORIES.find((c) => c.value === expense.category)
                  return (
                    <Card key={expense.id} padding="sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full shrink-0 ${CATEGORY_COLORS[expense.category]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{cat?.label ?? expense.category}</Badge>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatDate(expense.createdAt)}</span>
                          </div>
                          {expense.notes && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 truncate">{expense.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrencyFull(expense.amount)}
                          </p>
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleting === expense.id}
                            className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {deleting === expense.id
                              ? <div className="h-4 w-4 border border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                              : <Trash2 className="h-4 w-4" />
                            }
                          </button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
