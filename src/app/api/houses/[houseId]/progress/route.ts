import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess, requireAuth } from '@/lib/auth'
import { createNotificationForHouseMembers } from '@/lib/notifications'
import { createAuditLog } from '@/lib/audit'

const createUpdateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  media: z
    .array(
      z.object({
        fileUrl: z.string().url(),
        mediaType: z.enum(['PHOTO', 'VIDEO']),
      })
    )
    .max(20)
    .optional(),
})

const verifyUpdateSchema = z.object({
  updateId: z.string().uuid(),
  approved: z.boolean(),
  feedback: z.string().max(500).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [updates, total] = await Promise.all([
    prisma.progressUpdate.findMany({
      where: { houseId },
      include: {
        submitter: { select: { id: true, fullName: true, profileImage: true, role: true } },
        media: true,
        verification: {
          include: { verifier: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.progressUpdate.count({ where: { houseId } }),
  ])

  return NextResponse.json({ updates, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'progress:submit')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  // Handle verification
  if (action === 'verify') {
    const verifyError = (await requireHouseAccess(houseId, 'progress:verify')).error
    if (verifyError) return verifyError

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = verifyUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { updateId, approved, feedback } = parsed.data

    // Ensure update belongs to this house
    const update = await prisma.progressUpdate.findFirst({ where: { id: updateId, houseId } })
    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 })
    }

    const verification = await prisma.progressVerification.upsert({
      where: { updateId },
      update: { approved, feedback, verifiedBy: user!.id, verifiedAt: new Date() },
      create: { updateId, verifiedBy: user!.id, approved, feedback },
    })

    await createAuditLog({
      userId: user!.id,
      houseId,
      action: approved ? 'PROGRESS_VERIFIED' : 'PROGRESS_REJECTED',
      entity: 'ProgressUpdate',
      entityId: updateId,
      metadata: { approved, feedback },
    })

    // Notify submitter
    await prisma.notification.create({
      data: {
        userId: update.submittedBy,
        title: approved ? 'Progress Update Approved' : 'Progress Update Rejected',
        body: feedback ?? (approved ? 'Your progress update has been approved.' : 'Your progress update was not approved.'),
      },
    })

    return NextResponse.json(verification)
  }

  // Handle new progress update
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const update = await prisma.progressUpdate.create({
    data: {
      houseId,
      submittedBy: user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      media: parsed.data.media
        ? { createMany: { data: parsed.data.media } }
        : undefined,
    },
    include: {
      submitter: { select: { id: true, fullName: true, profileImage: true } },
      media: true,
    },
  })

  await createNotificationForHouseMembers({
    houseId,
    title: `New Progress Update: ${parsed.data.title}`,
    body: `${user!.fullName} submitted a progress update${parsed.data.description ? ': ' + parsed.data.description.slice(0, 100) : '.'}`,
    excludeUserId: user!.id,
  })

  return NextResponse.json(update, { status: 201 })
}
