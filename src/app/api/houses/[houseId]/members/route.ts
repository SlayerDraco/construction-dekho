import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['FAMILY_MEMBER', 'CONTRACTOR', 'ARCHITECT']),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const members = await prisma.houseMember.findMany({
    where: { houseId },
    include: {
      user: { select: { id: true, fullName: true, email: true, profileImage: true, role: true } },
    },
  })

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: { owner: { select: { id: true, fullName: true, email: true, profileImage: true, role: true } } },
  })

  return NextResponse.json({ members, owner: house?.owner })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'house:manage_members')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = addMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found. They must register first.' }, { status: 404 })
  }

  // Check not already a member
  const existing = await prisma.houseMember.findUnique({
    where: { houseId_userId: { houseId, userId: targetUser.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'User is already a member of this house' }, { status: 409 })
  }

  const member = await prisma.houseMember.create({
    data: { houseId, userId: targetUser.id, role: parsed.data.role },
    include: { user: { select: { id: true, fullName: true, email: true, profileImage: true } } },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'MEMBER_ADDED',
    entity: 'HouseMember',
    entityId: member.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  })

  await prisma.notification.create({
    data: {
      userId: targetUser.id,
      title: 'Added to House Project',
      body: `You have been added to a house project as ${parsed.data.role.replace('_', ' ')}.`,
    },
  })

  return NextResponse.json(member, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'house:manage_members')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const memberId = searchParams.get('memberId')

  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  }

  const member = await prisma.houseMember.findFirst({ where: { id: memberId, houseId } })
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  await prisma.houseMember.delete({ where: { id: memberId } })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'MEMBER_REMOVED',
    entity: 'HouseMember',
    entityId: memberId,
    metadata: {},
  })

  return NextResponse.json({ success: true })
}
