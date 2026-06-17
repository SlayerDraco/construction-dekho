'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/index'
import { formatDate } from '@/lib/utils'
import { Wrench, MapPin, CheckCircle, Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

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
}

export function ProviderDetail({ provider, houseId, canReview }: ProviderDetailProps) {
  const router = useRouter()
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    wouldHireAgain: null as boolean | null,
    reason: '',
  })

  const alreadyReviewed = houseId
    ? provider.reviews.some((r: any) => r.houseId === houseId)
    : false

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
          <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Wrench className="h-8 w-8 text-zinc-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{provider.businessName}</h1>
              {provider.verified && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Verified</span>
                </div>
              )}
            </div>

            {provider.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{provider.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3">
              {provider.reviewCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    provider.hireAgainRate >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : provider.hireAgainRate >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {provider.hireAgainRate}%
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Would Hire Again</p>
                    <p className="text-[10px] text-zinc-400">{provider.reviewCount} review{provider.reviewCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Categories & service areas */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {provider.categories.map((c: any) => (
              <Badge key={c.id} variant="outline">{c.category.name}</Badge>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">Service Areas</p>
          {provider.serviceAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {provider.serviceAreas.map((sa: any) => (
                <div key={sa.id} className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  {sa.city} ({sa.radius}km)
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">No service areas listed</p>
          )}
        </Card>
      </div>

      {/* Leave a review */}
      {canReview && houseId && !alreadyReviewed && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Leave a Review</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Would you hire this provider again?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewForm((f) => ({ ...f, wouldHireAgain: true, reason: '' }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    reviewForm.wouldHireAgain === true
                      ? 'bg-green-600 text-white border-green-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-green-400'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes, definitely
                </button>
                <button
                  onClick={() => setReviewForm((f) => ({ ...f, wouldHireAgain: false }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    reviewForm.wouldHireAgain === false
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-red-400'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </button>
              </div>
            </div>

            {reviewForm.wouldHireAgain === false && (
              <div>
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Reason (required)</p>
                <div className="flex flex-wrap gap-2">
                  {REJECT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReviewForm((f) => ({ ...f, reason: r.value }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        reviewForm.reason === r.value
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
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
        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            You have already reviewed this provider for this project.
          </p>
        </Card>
      )}

      {/* Reviews */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
          Reviews ({provider.reviews.length})
        </h2>

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
                    review.wouldHireAgain
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {review.wouldHireAgain
                      ? <ThumbsUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      : <ThumbsDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={review.wouldHireAgain ? 'success' : 'danger'}>
                        {review.wouldHireAgain ? 'Would hire again' : 'Would not hire again'}
                      </Badge>
                      {review.reason && <Badge variant="outline">{review.reason.replace('_', ' ')}</Badge>}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {review.house?.projectName} · {review.house?.city} · {formatDate(review.createdAt)}
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
