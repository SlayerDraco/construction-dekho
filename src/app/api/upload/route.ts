import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getPresignedUploadUrl, generateFileKey } from '@/lib/storage'

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  folder: z.enum(['documents', 'progress', 'avatars', 'providers']).default('documents'),
  houseId: z.string().uuid().optional(),
})

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/mpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const MAX_SIZE_MB = 50

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = presignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { fileName, contentType, folder, houseId } = parsed.data

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: `File type not allowed: ${contentType}` }, { status: 400 })
  }

  const key = generateFileKey(houseId ?? user!.id, fileName)

  try {
    const result = await getPresignedUploadUrl(key, contentType, folder)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Upload] Failed to generate presigned URL:', err)
    return NextResponse.json(
      { error: 'Failed to generate upload URL. Please try again.' },
      { status: 500 }
    )
  }
}
