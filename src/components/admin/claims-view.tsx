'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Modal, Textarea } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { FileText, CheckCircle, XCircle } from 'lucide-react'

interface AdminClaimsViewProps {
  claims: any[]
  counts: { PENDING: number; APPROVED: number; REJECTED: number }
  activeStatus: string
}

export function AdminClaimsView({ claims, counts, activeStatus }: AdminClaimsViewProps) {
  const router = useRouter()
  const [reviewModal, setReviewModal] = useState<{ claim: any; approve: boolean } | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleReview(claimId: string, approved: boolean, notes: string) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/claims?action=review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, approved, adminNotes: notes || undefined }),
      })
      if (res.ok) {
        toast.success(approved ? 'Claim approved' : 'Claim rejected')
        setReviewModal(null)
        setAdminNotes('')
        router.refresh()
      } else {
        toast.error('Failed to process claim')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const statusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => router.push(`/admin/claims?status=${s}`)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeStatus === s
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {claims.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title={`No ${activeStatus.toLowerCase()} claims`} description="Claim requests appear here when providers submit them." />
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Card key={claim.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {claim.provider?.businessName}
                    </p>
                    <Badge variant={statusVariant[claim.status] ?? 'outline'}>{claim.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Claimed by <span className="font-medium text-zinc-700 dark:text-zinc-300">{claim.claimant?.fullName}</span>
                    {' '}({claim.claimant?.email})
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Submitted {formatDate(claim.createdAt)}
                    {claim.reviewedAt && ` · Reviewed ${formatDate(claim.reviewedAt)}`}
                  </p>
                  {claim.adminNotes && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 italic">
                      Admin note: {claim.adminNotes}
                    </p>
                  )}
                </div>
                {claim.status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      onClick={() => setReviewModal({ claim, approve: true })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
                      onClick={() => setReviewModal({ claim, approve: false })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!reviewModal}
        onClose={() => { setReviewModal(null); setAdminNotes('') }}
        title={reviewModal?.approve ? 'Approve Claim' : 'Reject Claim'}
        description={`Provider: ${reviewModal?.claim?.provider?.businessName}`}
      >
        <div className="space-y-4">
          {reviewModal?.approve && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">
                Approving will transfer ownership of this provider profile to {reviewModal.claim?.claimant?.fullName}.
              </p>
            </div>
          )}
          <Textarea
            label="Admin Notes (optional)"
            placeholder="Add a note for the claimant..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => handleReview(reviewModal!.claim.id, reviewModal!.approve, adminNotes)}
              loading={submitting}
              variant={reviewModal?.approve ? 'default' : 'destructive'}
            >
              {reviewModal?.approve ? 'Approve Claim' : 'Reject Claim'}
            </Button>
            <Button variant="ghost" onClick={() => { setReviewModal(null); setAdminNotes('') }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
