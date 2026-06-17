'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Select } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Wrench, MapPin, CheckCircle, Star, ThumbsUp, ThumbsDown, MessageSquare, Plus } from 'lucide-react'

const REJECT_REASONS = [
  { label: 'Poor Quality', value: 'POOR_QUALITY' },
  { label: 'Delayed Work', value: 'DELAYED_WORK' },
  { label: 'Over Budget', value: 'OVER_BUDGET' },
  { label: 'Poor Communication', value: 'POOR_COMMUNICATION' },
  { label: 'Other', value: 'OTHER' },
]

interface ProviderDetailProps {
  provider: any
  houseId?: string
  canReview: boolean
  currentUserId: string
  userHouses?: { id: string; projectName: string }[]
}

export function ProviderDetail({ provider, houseId, canReview, userHouses = [] }: ProviderDetailProps) {
  const router = useRouter()
  const [submittingReview, setSubmittingReview] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignHouseId, setAssignHouseId] = useState('')
  
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    wouldHireAgain: null as boolean | null,
    reason: '',
  })

  const alreadyReviewed = houseId
    ? provider.reviews.some((r: any) => r.houseId === houseId)
    : false

  const avgRating = provider.reviewCount > 0 
    ? (provider.reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / provider.reviewCount).toFixed(1)
    : "0.0"

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: provider.reviews?.filter((r: any) => (r.rating || 5) === stars).length || 0
  }))

  async function handleAssign() {
    if (!assignHouseId) return toast.error("Please select a project first")
    setAssigning(true)
    try {
      const res = await fetch(`/api/houses/${assignHouseId}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id })
      })
      if (res.ok) {
        toast.success("Provider successfully added to project")
        router.refresh()
      } else {
        toast.error("Failed to add provider to project")
      }
    } finally {
      setAssigning(false)
    }
  }

  async function submitReview() {
    if (reviewForm.wouldHireAgain === null) {
      toast.error('Please select whether you would hire again')
      return
    }
    if (!reviewForm.wouldHireAgain && !reviewForm.reason) {
      toast.error('Please select a reason')
      return
    }
    if (!houseId) {
      toast.error('No house selected for review')
      return
    }

    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          houseId,
          rating: reviewForm.rating,
          wouldHireAgain: reviewForm.wouldHireAgain,
          reason: reviewForm.reason || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Review submitted')
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to submit review')
      }
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      {/* Provider header */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
            <Wrench className="h-8 w-8 text-zinc-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-zinc-900">{provider.businessName}</h1>
              {provider.verified && (
                <div className="flex items-center gap-1 text-blue-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Verified</span>
                </div>
              )}
            </div>

            {provider.description && (
              <p className="text-sm text-zinc-600 mt-1">{provider.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-zinc-900">{avgRating}</span>
                <span className="text-xs text-zinc-500">({provider.reviewCount} reviews)</span>
              </div>
              
              {provider.reviewCount > 0 && (
                <div className="flex items-center gap-1.5 ml-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    provider.hireAgainRate >= 80 ? 'bg-green-100 text-green-700'
                    : provider.hireAgainRate >= 50 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {provider.hireAgainRate}%
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-700">Would Hire Again</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Assignment Section */}
      {userHouses.length > 0 && (
        <Card className="bg-zinc-50 border-zinc-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Add to your project</h3>
              <p className="text-xs text-zinc-500 mt-1">Hire this provider and track their work in your active projects.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={assignHouseId}
                onChange={(e) => setAssignHouseId(e.target.value)}
                options={[
                  { label: 'Select a project...', value: '' },
                  ...userHouses.map(h => ({ 
                    label: provider.houseProviders?.some((hp: any) => hp.houseId === h.id) 
                      ? `${h.projectName} (Already Added)` 
                      : h.projectName, 
                    value: h.id 
                  }))
                ]}
              />
              <Button onClick={handleAssign} loading={assigning} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Categories & service areas */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {provider.categories.map((c: any) => (
              <Badge key={c.id} variant="outline">{c.category.name}</Badge>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Service Areas</p>
          {provider.serviceAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {provider.serviceAreas.map((sa: any) => (
                <div key={sa.id} className="flex items-center gap-1 text-xs text-zinc-600">
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  {sa.city} ({sa.radius}km)
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No service areas listed</p>
          )}
        </Card>
      </div>

      {/* Reviews Breakdown & List */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
          Reviews ({provider.reviews.length})
        </h2>

        {provider.reviews.length > 0 && (
          <Card className="mb-6">
            <div className="space-y-2">
              {breakdown.map(({ stars, count }) => (
                <div key={stars} className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 w-12 shrink-0">
                    <span className="font-medium text-zinc-700">{stars}</span>
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 rounded-full" 
                      style={{ width: `${provider.reviewCount > 0 ? (count / provider.reviewCount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-zinc-500 text-xs">{count}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Leave a review */}
        {canReview && houseId && !alreadyReviewed && (
          <Card className="mb-6 border-zinc-300 bg-zinc-50">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-yellow-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Leave a Review</h2>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-zinc-700 mb-2">Overall Rating</p>
                <div className="flex gap-1 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      onClick={() => setReviewForm(f => ({ ...f, rating: star }))}
                      className={`h-6 w-6 transition-colors ${star <= reviewForm.rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'}`} 
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-700 mb-2">
                  Would you hire this provider again?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewForm((f) => ({ ...f, wouldHireAgain: true, reason: '' }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      reviewForm.wouldHireAgain === true
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-zinc-200 text-zinc-600 hover:border-green-400'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Yes
                  </button>
                  <button
                    onClick={() => setReviewForm((f) => ({ ...f, wouldHireAgain: false }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      reviewForm.wouldHireAgain === false
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-zinc-200 text-zinc-600 hover:border-red-400'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    No
                  </button>
                </div>
              </div>

              {reviewForm.wouldHireAgain === false && (
                <div>
                  <p className="text-xs font-medium text-zinc-700 mb-2">Reason (required)</p>
                  <div className="flex flex-wrap gap-2">
                    {REJECT_REASONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setReviewForm((f) => ({ ...f, reason: r.value }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          reviewForm.reason === r.value
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={submitReview} loading={submittingReview} size="sm">
                Submit Review
              </Button>
            </div>
          </Card>
        )}

        {alreadyReviewed && (
          <Card className="bg-green-50 border-green-200 mb-6">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              You have already reviewed this provider for this project.
            </p>
          </Card>
        )}

        {provider.reviews.length === 0 ? (
          <Card>
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Be the first to review this provider after working with them."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {provider.reviews.map((review: any) => (
              <Card key={review.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    review.wouldHireAgain ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {review.wouldHireAgain
                      ? <ThumbsUp className="h-3.5 w-3.5 text-green-600" />
                      : <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-3.5 w-3.5 ${star <= (review.rating || 5) ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-200 fill-zinc-200'}`} 
                          />
                        ))}
                      </div>
                      <Badge variant={review.wouldHireAgain ? 'success' : 'danger'}>
                        {review.wouldHireAgain ? 'Would hire again' : 'Would not hire'}
                      </Badge>
                      {review.reason && <Badge variant="outline">{review.reason.replace('_', ' ')}</Badge>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Project: {review.house?.projectName} · {review.house?.city} · {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}