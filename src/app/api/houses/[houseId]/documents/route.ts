import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'
import { createAuditLog } from '@/lib/audit'

const createDocumentSchema = z.object({
  name: z.string().min(1).max(200),
  documentType: z.enum(['DRAWING', 'INVOICE', 'WARRANTY', 'PLAN', 'OTHER']),
  fileUrl: z.string().url(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'document:read')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')
  const query = searchParams.get('q')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { houseId }
  if (type) where.documentType = type
  if (query) where.name = { contains: query, mode: 'insensitive' }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ documents, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'document:upload')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const document = await prisma.document.create({
    data: {
      houseId,
      name: parsed.data.name,
      documentType: parsed.data.documentType,
      fileUrl: parsed.data.fileUrl,
    },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'DOCUMENT_UPLOADED',
    entity: 'Document',
    entityId: document.id,
    metadata: { name: document.name, type: document.documentType },
  })

  return NextResponse.json(document, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'document:delete')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const documentId = searchParams.get('id')

  if (!documentId) {
    return NextResponse.json({ error: 'Document id required' }, { status: 400 })
  }

  const document = await prisma.document.findFirst({ where: { id: documentId, houseId } })
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // Extract key from URL and delete from R2
  try {
    const url = new URL(document.fileUrl)
    const key = url.pathname.slice(1) // remove leading slash
    await deleteFile(key)
  } catch {
    // If R2 deletion fails, still remove from DB
    console.error('Failed to delete file from R2')
  }

  await prisma.document.delete({ where: { id: documentId } })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'DOCUMENT_DELETED',
    entity: 'Document',
    entityId: documentId,
    metadata: { name: document.name },
  })

  return NextResponse.json({ success: true })
}
