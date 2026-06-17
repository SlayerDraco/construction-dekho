'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Badge, EmptyState, Select, Modal } from '@/components/ui/index'
import { Input } from '@/components/ui/index'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  FileText, Upload, Trash2, Download, Filter, Search,
  File, Plus
} from 'lucide-react'

const DOC_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Drawing', value: 'DRAWING' },
  { label: 'Invoice', value: 'INVOICE' },
  { label: 'Warranty', value: 'WARRANTY' },
  { label: 'Plan', value: 'PLAN' },
  { label: 'Other', value: 'OTHER' },
]

const TYPE_COLORS: Record<string, string> = {
  DRAWING: 'info',
  INVOICE: 'success',
  WARRANTY: 'warning',
  PLAN: 'outline',
  OTHER: 'outline',
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAWING: File,
  INVOICE: FileText,
  WARRANTY: FileText,
  PLAN: File,
  OTHER: FileText,
}

interface DocumentVaultProps {
  houseId: string
  houseName: string
  documents: any[]
  canUpload: boolean
  canDelete: boolean
}

export function DocumentVault({ houseId, houseName, documents: initialDocs, canUpload, canDelete }: DocumentVaultProps) {
  const [documents, setDocuments] = useState(initialDocs)
  const [showUpload, setShowUpload] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploadForm, setUploadForm] = useState({ name: '', documentType: 'OTHER' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = documents.filter((d) => {
    if (filterType && d.documentType !== filterType) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleUpload() {
    if (!selectedFile || !uploadForm.name.trim()) {
      toast.error('Please select a file and enter a name')
      return
    }
    setUploading(true)
    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type,
          folder: 'documents',
          houseId,
        }),
      })

      if (!presignRes.ok) {
        const err = await presignRes.json()
        throw new Error(err.error ?? 'Failed to get upload URL')
      }

      const { uploadUrl, fileUrl } = await presignRes.json()

      // Step 2: Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      })

      if (!uploadRes.ok) throw new Error('Upload to storage failed')

      // Step 3: Create document record
      const docRes = await fetch(`/api/houses/${houseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadForm.name,
          documentType: uploadForm.documentType,
          fileUrl,
        }),
      })

      if (!docRes.ok) throw new Error('Failed to save document record')

      const doc = await docRes.json()
      setDocuments((prev) => [doc, ...prev])
      setShowUpload(false)
      setSelectedFile(null)
      setUploadForm({ name: '', documentType: 'OTHER' })
      toast.success('Document uploaded successfully')
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/houses/${houseId}/documents?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id))
        toast.success('Document deleted')
      } else {
        toast.error('Failed to delete document')
      }
    } finally {
      setDeleting(null)
    }
  }

  const typeGroups = DOC_TYPES.slice(1).map((t) => ({
    ...t,
    count: documents.filter((d) => d.documentType === t.value).length,
  }))

  return (
    <div>
      <PageHeader
        title="Document Vault"
        description={`${houseName} · ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        action={
          canUpload && (
            <Button leftIcon={<Upload className="h-4 w-4" />} size="sm" onClick={() => setShowUpload(true)}>
              Upload
            </Button>
          )
        }
      />

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Category counts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterType === ''
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
            }`}
          >
            All ({documents.length})
          </button>
          {typeGroups.filter((t) => t.count > 0).map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterType === t.value
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-300"
          />
        </div>

        {/* Documents */}
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title={search || filterType ? 'No documents match your filters' : 'No documents yet'}
              description={
                search || filterType
                  ? 'Try different search terms or clear filters.'
                  : 'Upload drawings, invoices, warranties, and plans to keep everything organised.'
              }
              action={
                canUpload && !search && !filterType ? (
                  <Button leftIcon={<Upload className="h-4 w-4" />} size="sm" onClick={() => setShowUpload(true)}>
                    Upload Document
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((doc) => {
              const Icon = TYPE_ICONS[doc.documentType] ?? FileText
              return (
                <Card key={doc.id} padding="sm" hover>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Icon className="h-4.5 w-4.5 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{doc.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={TYPE_COLORS[doc.documentType] as any}>{doc.documentType}</Badge>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      View / Download
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        {deleting === doc.id
                          ? <div className="h-3.5 w-3.5 border border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
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

      {/* Upload modal */}
      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Document"
        description="Add a document to your vault. Supported: PDF, images, Word, Excel."
      >
        <div className="space-y-4">
          <Input
            label="Document Name"
            placeholder="e.g., Foundation Drawing - Rev 2"
            value={uploadForm.name}
            onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Document Type"
            value={uploadForm.documentType}
            onChange={(e) => setUploadForm((f) => ({ ...f, documentType: e.target.value }))}
            options={DOC_TYPES.slice(1)}
          />
          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setSelectedFile(file)
                  if (!uploadForm.name) {
                    setUploadForm((f) => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }))
                  }
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-xs">
                {selectedFile ? selectedFile.name : 'Click to select file'}
              </span>
              {selectedFile && (
                <span className="text-[10px] text-zinc-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={handleUpload} loading={uploading} disabled={!selectedFile}>
              Upload Document
            </Button>
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
