'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Modal, Textarea } from '@/components/ui/index'
import { Input } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import {
  TrendingUp, Plus, Check, X, Camera, Video,
  Upload, CheckCircle, XCircle, Clock
} from 'lucide-react'

interface ProgressViewProps {
  houseId: string
  houseName: string
  updates: any[]
  currentUserId: string
  canSubmit: boolean
  canVerify: boolean
}

export function ProgressView({ houseId, houseName, updates: initialUpdates, currentUserId, canSubmit, canVerify }: ProgressViewProps) {
  const router = useRouter()
  const [updates, setUpdates] = useState(initialUpdates)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '' })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploadedMedia, setUploadedMedia] = useState<{ fileUrl: string; mediaType: 'PHOTO' | 'VIDEO' }[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [verifyModal, setVerifyModal] = useState<{ updateId: string; title: string } | null>(null)
  const [verifyFeedback, setVerifyFeedback] = useState('')

  async function uploadMediaFile(file: File): Promise<{ fileUrl: string; mediaType: 'PHOTO' | 'VIDEO' } | null> {
    try {
      const isVideo = file.type.startsWith('video/')
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'progress',
          houseId,
        }),
      })
      if (!presignRes.ok) return null
      const { uploadUrl, fileUrl } = await presignRes.json()

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      return { fileUrl, mediaType: isVideo ? 'VIDEO' : 'PHOTO' }
    } catch {
      return null
    }
  }

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingMedia(true)
    const uploaded: typeof uploadedMedia = []
    for (const file of files) {
      const result = await uploadMediaFile(file)
      if (result) uploaded.push(result)
    }
    setUploadedMedia((prev) => [...prev, ...uploaded])
    setUploadingMedia(false)
    if (uploaded.length < files.length) {
      toast.error(`${files.length - uploaded.length} file(s) failed to upload`)
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/houses/${houseId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
        }),
      })
      if (res.ok) {
        toast.success('Progress update submitted')
        setShowForm(false)
        setForm({ title: '', description: '' })
        setUploadedMedia([])
        router.refresh()
      } else {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to submit update')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(updateId: string, approved: boolean, feedback: string) {
    setVerifying(updateId)
    try {
      const res = await fetch(`/api/houses/${houseId}/progress?action=verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateId, approved, feedback: feedback || undefined }),
      })
      if (res.ok) {
        toast.success(approved ? 'Update approved' : 'Update rejected')
        setVerifyModal(null)
        setVerifyFeedback('')
        router.refresh()
      } else {
        toast.error('Failed to verify update')
      }
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Progress Updates"
        description={`${houseName} · ${updates.length} update${updates.length !== 1 ? 's' : ''}`}
        action={
          canSubmit && (
            <Button leftIcon={<Plus className="h-4 w-4" />} size="sm" onClick={() => setShowForm(true)}>
              Add Update
            </Button>
          )
        }
      />

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Submit form */}
        {showForm && canSubmit && (
          <Card>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">New Progress Update</h3>
            <div className="space-y-3">
              <Input
                label="Title"
                placeholder="e.g., Foundation concrete poured"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <Textarea
                label="Notes (optional)"
                placeholder="Describe what was done today..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />

              {/* Media upload */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Photos / Videos</label>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleMediaSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingMedia}
                  className="w-full h-20 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-50"
                >
                  {uploadingMedia ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                      <span className="text-xs">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      <span className="text-xs">Add photos or videos</span>
                    </>
                  )}
                </button>
                {uploadedMedia.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {uploadedMedia.map((m, i) => (
                      <div key={i} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                        {m.mediaType === 'VIDEO' ? <Video className="h-3 w-3 text-zinc-500" /> : <Camera className="h-3 w-3 text-zinc-500" />}
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">{m.mediaType}</span>
                        <button
                          onClick={() => setUploadedMedia((prev) => prev.filter((_, j) => j !== i))}
                          className="text-zinc-400 hover:text-red-500 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={handleSubmit} loading={submitting} size="sm">Submit Update</Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setUploadedMedia([]) }}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Updates list */}
        {updates.length === 0 ? (
          <Card>
            <EmptyState
              icon={TrendingUp}
              title="No updates yet"
              description="Start tracking construction progress by submitting your first update."
              action={
                canSubmit && (
                  <Button leftIcon={<Plus className="h-4 w-4" />} size="sm" onClick={() => setShowForm(true)}>
                    Add First Update
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          updates.map((update) => (
            <Card key={update.id}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-600 dark:text-zinc-400">
                  {update.submitter?.fullName?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{update.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {update.submitter?.fullName} · {formatRelativeTime(update.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {update.verification ? (
                        <Badge variant={update.verification.approved ? 'success' : 'danger'}>
                          {update.verification.approved ? (
                            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approved</span>
                          ) : (
                            <span className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rejected</span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {update.description && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">{update.description}</p>
                  )}

                  {/* Media thumbnails */}
                  {update.media?.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {update.media.map((m: any) => (
                        <a
                          key={m.id}
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          {m.mediaType === 'VIDEO' ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                          View {m.mediaType.toLowerCase()}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Verification feedback */}
                  {update.verification?.feedback && (
                    <div className={`mt-2 p-2 rounded-lg text-xs ${
                      update.verification.approved
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {update.verification.verifier?.fullName}: "{update.verification.feedback}"
                    </div>
                  )}

                  {/* Verify actions */}
                  {canVerify && !update.verification && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Check className="h-3.5 w-3.5 text-green-600" />}
                        onClick={() => {
                          setVerifyModal({ updateId: update.id, title: update.title })
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<X className="h-3.5 w-3.5 text-red-500" />}
                        onClick={() => handleVerify(update.id, false, '')}
                        loading={verifying === update.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Approval modal */}
      <Modal
        open={!!verifyModal}
        onClose={() => { setVerifyModal(null); setVerifyFeedback('') }}
        title="Approve Update"
        description={verifyModal?.title}
      >
        <div className="space-y-3">
          <Textarea
            label="Feedback (optional)"
            placeholder="Add a note for the submitter..."
            value={verifyFeedback}
            onChange={(e) => setVerifyFeedback(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => handleVerify(verifyModal!.updateId, true, verifyFeedback)}
              loading={verifying === verifyModal?.updateId}
              leftIcon={<Check className="h-4 w-4" />}
            >
              Approve
            </Button>
            <Button variant="ghost" onClick={() => { setVerifyModal(null); setVerifyFeedback('') }}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
