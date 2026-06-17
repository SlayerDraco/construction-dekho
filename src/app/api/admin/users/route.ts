import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const updateUserSchema = z.object({
  role: z.enum(['OWNER', 'FAMILY_MEMBER', 'CONTRACTOR', 'SERVICE_PROVIDER', 'ARCHITECT', 'ADMIN']).optional(),
  fullName: z.string().min(2).max(100).optional(),
})

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') ?? ''
  const role = searchParams.get('role') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (query) {
    where.OR = [
      { fullName: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ]
  }
  if (role) where.role = role

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        _count: { select: { ownedHouses: true, notifications: true } },
        serviceProvider: { select: { id: true, businessName: true, verified: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) })
}

export async function PUT(request: NextRequest) {
  const { user: admin, error } = await requireAdmin()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  })

  await createAuditLog({
    userId: admin!.id,
    action: 'ADMIN_ACTION',
    entity: 'User',
    entityId: userId,
    metadata: { action: 'update_user', changes: parsed.data },
  })

  return NextResponse.json(updated)
}
