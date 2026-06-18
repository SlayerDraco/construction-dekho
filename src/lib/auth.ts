import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'
import type { UserRole, HouseMemberRole, Permission } from './types'

export type { Permission }

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'house:read', 'house:write', 'house:delete', 'house:manage_members',
    'task:write', 'stage:complete', 'budget:write', 'budget:read',
    'document:upload', 'document:delete', 'document:read',
    'progress:submit', 'progress:verify', 'decision:write',
    'admin:access', 'provider:manage',
  ],
  OWNER: [
    'house:read', 'house:write', 'house:manage_members',
    'task:write', 'stage:complete', 'budget:write', 'budget:read',
    'document:upload', 'document:delete', 'document:read',
    'progress:submit', 'progress:verify', 'decision:write',
  ],
  FAMILY_MEMBER: ['house:read', 'budget:read', 'document:read'],
  CONTRACTOR: ['house:read', 'progress:submit', 'document:read'],
  ARCHITECT: ['house:read', 'document:upload', 'document:read'],
  SERVICE_PROVIDER: ['house:read', 'progress:submit', 'provider:manage'],
}

export function hasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export async function getCurrentUser() {
  const { userId } = await auth()
  if (!userId) return null
  return prisma.user.findUnique({ where: { clerkId: userId } })
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, error: null }
}

export async function requireAdmin() {
  const { user, error } = await requireAuth()
  if (error) return { user: null, error }
  if ((user as any)?.role !== 'ADMIN') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function requireHouseAccess(houseId: string, permission: string) {
  const { user, error } = await requireAuth()
  if (error || !user) return { user: null, member: null, error: error ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  if ((user as any).role === 'ADMIN') return { user, member: null, error: null }

  const house = await prisma.house.findUnique({ where: { id: houseId } })
  if (house && (house as any).ownerId === (user as any).id && hasPermission('OWNER', permission)) {
    return { user, member: null, error: null }
  }

  const member = await prisma.houseMember.findUnique({
    where: { houseId_userId: { houseId, userId: (user as any).id } },
  })

  if (!member) {
    return { user: null, member: null, error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  if (!hasPermission((member as any).role, permission)) {
    return { user: null, member: null, error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }

  return { user, member, error: null }
}

export async function syncClerkUser(
  clerkId: string,
  data: {
    fullName: string
    email: string
    profileImage?: string
  }
) {
  console.log('SYNC USER', {
    clerkId,
    email: data.email,
  })

  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId },
  })

  console.log('EXISTING BY CLERK', existingByClerk)

  const existingByEmail = await prisma.user.findUnique({
    where: { email: data.email },
  })

  console.log('EXISTING BY EMAIL', existingByEmail)

  // User already exists with same email but different clerkId
  if (existingByEmail && !existingByClerk) {
    return prisma.user.update({
      where: { email: data.email },
      data: {
        clerkId,
        fullName: data.fullName,
        profileImage: data.profileImage,
      },
    })
  }

  return prisma.user.upsert({
    where: { clerkId },
    update: {
      fullName: data.fullName,
      email: data.email,
      profileImage: data.profileImage,
    },
    create: {
      clerkId,
      fullName: data.fullName,
      email: data.email,
      profileImage: data.profileImage,
      role: 'OWNER' as any,
    },
  })
}