import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const reviewClaimSchema = z.object({
  claimId: z.string().uuid(),
  approved: z.boolean(),
  adminNotes: z.string().max(500).optional(),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') ?? 'PENDING'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const [claims, total] = await Promise.all([
    prisma.claimRequest.findMany({
      where: { status },
      include: {
        provider: { select: { id: true, businessName: true, verified: true } },
        claimant: { select: { id: true, fullName: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.claimRequest.count({ where: { status } }),
  ])

  return NextResponse.json({ claims, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'review') {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = reviewClaimSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { claimId, approved, adminNotes } = parsed.data

    const claim = await prisma.claimRequest.findUnique({ where: { id: claimId } })
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

    await prisma.claimRequest.update({
      where: { id: claimId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        adminNotes,
        reviewedAt: new Date(),
      },
    })

    if (approved) {
      // Transfer provider ownership to claimant
      await prisma.serviceProvider.update({
        where: { id: claim.providerId },
        data: { userId: claim.claimantId },
      })
    }

    await createAuditLog({
      userId: admin!.id,
      action: approved ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
      entity: 'ClaimRequest',
      entityId: claimId,
      metadata: { approved, adminNotes },
    })

    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        title: approved ? 'Claim Request Approved' : 'Claim Request Rejected',
        body: approved
          ? 'Your provider profile claim has been approved. You now have full access.'
          : `Your claim was not approved.${adminNotes ? ' Note: ' + adminNotes : ''}`,
      },
    })

    return NextResponse.json({ success: true, approved })
  }

  // Submit a claim (by non-admin user)
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { providerId } = body as { providerId: string }
  if (!providerId) return NextResponse.json({ error: 'providerId required' }, { status: 400 })

  const existing = await prisma.claimRequest.findFirst({
    where: { providerId, claimantId: user!.id, status: 'PENDING' },
  })
  if (existing) return NextResponse.json({ error: 'Claim already pending' }, { status: 409 })

  const claim = await prisma.claimRequest.create({
    data: { providerId, claimantId: user!.id },
  })

  return NextResponse.json(claim, { status: 201 })
}
