import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '30')
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { userId: user!.id }
  if (unreadOnly) where.read = false

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user!.id, read: false } }),
  ])

  return NextResponse.json({ notifications, total, page, totalPages: Math.ceil(total / limit), unreadCount })
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'mark-all-read') {
    await prisma.notification.updateMany({
      where: { userId: user!.id, read: false },
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id } = body as { id: string }
  if (!id) return NextResponse.json({ error: 'Notification id required' }, { status: 400 })

  await prisma.notification.updateMany({
    where: { id, userId: user!.id },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
