'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Wrench, Search, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface AdminProvidersViewProps {
  providers: any[]
  total: number
  page: number
  totalPages: number
  categories: any[]
  initialFilters: { q?: string; verified?: string }
}

export function AdminProvidersView({ providers, total, page, totalPages, categories, initialFilters }: AdminProvidersViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialFilters.q ?? '')
  const [verifiedFilter, setVerifiedFilter] = useState(initialFilters.verified ?? '')
  const [updating, setUpdating] = useState<string | null>(null)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams()
    const qv = overrides.q ?? q
    const vf = overrides.verified ?? verifiedFilter
    if (qv) params.set('q', qv)
    if (vf !== '') params.set('verified', vf)
    params.set('page', '1')
    startTransition(() => router.push(`/admin/providers?${params.toString()}`))
  }

  async function toggleVerified(providerId: string, currentVerified: boolean) {
    setUpdating(providerId)
    try {
      const res = await fetch(`/api/admin/providers?id=${providerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !currentVerified }),
      })
      if (res.ok) {
        toast.success(currentVerified ? 'Verification removed' : 'Provider verified')
        router.refresh()
      } else {
        toast.error('Failed to update provider')
      }
    } finally {
      setUpdating(null)
    }
  }

  async function toggleActive(providerId: string, currentActive: boolean) {
    setUpdating(providerId)
    try {
      const res = await fetch(`/api/admin/providers?id=${providerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      if (res.ok) {
        toast.success(currentActive ? 'Provider deactivated' : 'Provider activated')
        router.refresh()
      } else {
        toast.error('Failed to update provider')
      }
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search providers..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300"
          />
        </div>
        <Select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); applyFilters({ verified: e.target.value }) }}
          options={[
            { label: 'All providers', value: '' },
            { label: 'Verified', value: 'true' },
            { label: 'Unverified', value: 'false' },
          ]}
          className="w-40"
        />
        <Button size="sm" onClick={() => applyFilters()} loading={isPending}>Search</Button>
      </div>

      {providers.length === 0 ? (
        <Card>
          <EmptyState icon={Wrench} title="No providers found" description="Try different search terms." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Categories</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Areas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reviews</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{p.businessName}</p>
                      <p className="text-xs text-zinc-500">{p.user?.email}</p>
                      <p className="text-[10px] text-zinc-400">{formatDate(p.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.categories.slice(0, 2).map((c: any) => (
                          <Badge key={c.id} variant="outline">{c.category.name}</Badge>
                        ))}
                        {p.categories.length > 2 && <Badge variant="outline">+{p.categories.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {p.serviceAreas.slice(0, 2).map((a: any) => a.city).join(', ')}
                      {p.serviceAreas.length > 2 && ` +${p.serviceAreas.length - 2}`}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{p._count?.reviews ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.verified
                          ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-0.5" />Verified</Badge>
                          : <Badge variant="outline">Unverified</Badge>}
                        {!p.active && <Badge variant="danger">Inactive</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={updating === p.id}
                          onClick={() => toggleVerified(p.id, p.verified)}
                        >
                          {p.verified ? 'Unverify' : 'Verify'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={updating === p.id}
                          onClick={() => toggleActive(p.id, p.active)}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">{total} total providers</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => { const p = new URLSearchParams(); if (q) p.set('q', q); p.set('page', String(page - 1)); router.push(`/admin/providers?${p}`) }}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => { const p = new URLSearchParams(); if (q) p.set('q', q); p.set('page', String(page + 1)); router.push(`/admin/providers?${p}`) }}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
