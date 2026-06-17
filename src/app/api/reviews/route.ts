import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireHouseAccess } from '@/lib/auth'

const createReviewSchema = z.object({
  providerId: z.string().uuid(),
  houseId: z.string().uuid(),
  wouldHireAgain: z.boolean(),
  reason: z.enum(['POOR_QUALITY', 'DELAYED_WORK', 'OVER_BUDGET', 'POOR_COMMUNICATION', 'OTHER']).optional(),
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const providerId = searchParams.get('providerId')
  const houseId = searchParams.get('houseId')

  const where: Record<string, unknown> = {}
  if (providerId) where.providerId = providerId
  if (houseId) where.houseId = houseId

  const reviews = await prisma.review.findMany({
    where,
    include: {
      house: { select: { id: true, projectName: true, city: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const stats = await prisma.review.groupBy({
    by: ['wouldHireAgain'],
    where: providerId ? { providerId } : undefined,
    _count: true,
  })

  const total = stats.reduce((sum, s) => sum + s._count, 0)
  const hireAgain = stats.find((s) => s.wouldHireAgain)?._count ?? 0

  return NextResponse.json({
    reviews,
    stats: {
      total,
      hireAgain,
      wouldNotHire: total - hireAgain,
      hireAgainRate: total > 0 ? Math.round((hireAgain / total) * 100) : 0,
    },
  })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { providerId, houseId, wouldHireAgain, reason } = parsed.data

  // Validate user has access to this house
  const { error: houseError } = await requireHouseAccess(houseId, 'house:read')
  if (houseError) return houseError

  if (!wouldHireAgain && !reason) {
    return NextResponse.json({ error: 'Reason is required when not hiring again' }, { status: 400 })
  }

  // Check for duplicate review
  const existing = await prisma.review.findFirst({ where: { providerId, houseId } })
  if (existing) {
    return NextResponse.json({ error: 'You have already reviewed this provider for this project' }, { status: 409 })
  }

  const review = await prisma.review.create({
    data: { providerId, houseId, wouldHireAgain, reason },
  })

  return NextResponse.json(review, { status: 201 })
}
