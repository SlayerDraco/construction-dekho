'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Wrench, Search, Star, MapPin, CheckCircle, ChevronLeft, ChevronRight, Zap } from 'lucide-react'

interface ProvidersViewProps {
  providers: any[]
  total: number
  page: number
  totalPages: number
  categories: any[]
  userHouses: any[]
  initialFilters: { q?: string; city?: string; category?: string }
}

function ProviderCard({ provider, houseId }: { provider: any; houseId?: string }) {
  return (
    <Card hover>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
          <Wrench className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {provider.businessName}
                </h3>
                {provider.verified && (
                  <CheckCircle className="h-4 w-4 text-blue-500 shrink-0" />
                )}
              </div>
              {provider.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                  {provider.description}
                </p>
              )}
            </div>
            {provider.hireAgainRate > 0 && (
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{provider.hireAgainRate}%</p>
                <p className="text-[10px] text-zinc-400">hire again</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {provider.categories.slice(0, 3).map((c: any) => (
              <Badge key={c.id} variant="outline">{c.category.name}</Badge>
            ))}
            {provider.categories.length > 3 && (
              <Badge variant="outline">+{provider.categories.length - 3}</Badge>
            )}
          </div>

          {provider.serviceAreas.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <MapPin className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {provider.serviceAreas.slice(0, 3).map((sa: any) => sa.city).join(', ')}
                {provider.serviceAreas.length > 3 && ` +${provider.serviceAreas.length - 3} more`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            {provider.reviewCount > 0 ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {provider.reviewCount} review{provider.reviewCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">No reviews yet</span>
            )}
            {houseId && (
              <Link href={`/providers/${provider.id}?houseId=${houseId}`}>
                <Button size="sm" variant="outline">View Profile</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ProvidersView({
  providers,
  total,
  page,
  totalPages,
  categories,
  userHouses,
  initialFilters,
}: ProvidersViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialFilters.q ?? '')
  const [city, setCity] = useState(initialFilters.city ?? '')
  const [category, setCategory] = useState(initialFilters.category ?? '')
  const [selectedHouse, setSelectedHouse] = useState(userHouses[0]?.id ?? '')
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  function applyFilters(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams()
    const qv = overrides.q ?? q
    const cv = overrides.city ?? city
    const catv = overrides.category ?? category
    if (qv) params.set('q', qv)
    if (cv) params.set('city', cv)
    if (catv) params.set('category', catv)
    params.set('page', '1')
    startTransition(() => router.push(`/providers?${params.toString()}`))
  }

  async function loadRecommendations() {
    if (!selectedHouse) return
    setLoadingRecs(true)
    try {
      const res = await fetch(`/api/houses/${selectedHouse}/providers`)
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data)
      }
    } finally {
      setLoadingRecs(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
      {/* Smart recommendations */}
      {userHouses.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-yellow-500" />
              Smart Recommendations
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              options={userHouses.map((h) => ({ label: h.projectName, value: h.id }))}
              className="w-auto"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={loadRecommendations}
              loading={loadingRecs}
            >
              Get Recommendations
            </Button>
          </div>
          {recommendations.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {recommendations.map((p) => (
                <ProviderCard key={p.id} provider={p} houseId={selectedHouse} />
              ))}
            </div>
          )}
          {recommendations.length === 0 && !loadingRecs && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
              Select a house and click "Get Recommendations" to see providers relevant to your current stage.
            </p>
          )}
        </Card>
      )}

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
        <input
          type="text"
          placeholder="City..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="h-9 w-40 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300"
        />
        <Select
          value={category}
          onChange={(e) => { setCategory(e.target.value); applyFilters({ category: e.target.value }) }}
          options={[
            { label: 'All categories', value: '' },
            ...categories.map((c) => ({ label: c.name, value: c.name })),
          ]}
          className="w-48"
        />
        <Button size="sm" onClick={() => applyFilters()} loading={isPending}>
          Search
        </Button>
      </div>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total} provider{total !== 1 ? 's' : ''} found
          </p>
        </div>

        {providers.length === 0 ? (
          <Card>
            <EmptyState
              icon={Wrench}
              title="No providers found"
              description="Try different search terms, or clear filters to browse all providers."
              action={
                (q || city || category) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQ(''); setCity(''); setCategory('')
                      startTransition(() => router.push('/providers'))
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => {
                const params = new URLSearchParams()
                if (q) params.set('q', q)
                if (city) params.set('city', city)
                if (category) params.set('category', category)
                params.set('page', String(page - 1))
                router.push(`/providers?${params.toString()}`)
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => {
                const params = new URLSearchParams()
                if (q) params.set('q', q)
                if (city) params.set('city', city)
                if (category) params.set('category', category)
                params.set('page', String(page + 1))
                router.push(`/providers?${params.toString()}`)
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
