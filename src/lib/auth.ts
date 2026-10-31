import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Permission } from '@/lib/types'
import { DEMO_COOKIE, DEMO_PROFILES, type DemoProfile } from '@/lib/demo-profiles'

/**
 * Demo session handling. No Clerk, no tokens: a `demo_profile_id` cookie
 * selects one of the pre-seeded users (see prisma/seed.ts).
 */
export { DEMO_COOKIE, DEMO_PROFILES } from '@/lib/demo-profiles'

/** Lightweight session from the cookie only (no DB hit). */
export async function getCurrentUser(): Promise<DemoProfile | null> {
  const cookieStore = await cookies()
  const profileId = cookieStore.get(DEMO_COOKIE)?.value
  if (!profileId) return null
  return DEMO_PROFILES.find((p) => p.id === profileId) ?? null
}

function json(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

/** Resolves the DB user for the current demo profile. */
export async function requireAuth() {
  const session = await getCurrentUser()
  if (!session) return { user: null, error: json('Not authenticated', 401) }

  const user = await prisma.user.findUnique({ where: { id: session.id } })
  if (!user) {
    return { user: null, error: json('Demo data not seeded. Run `npm run db:seed`.', 404) }
  }
  return { user, error: null }
}

export async function requireAdmin() {
  const { user, error } = await requireAuth()
  if (error || !user) return { user: null, error: error ?? json('Not authenticated', 401) }
  if (user.role !== 'ADMIN') return { user: null, error: json('Forbidden', 403) }
  return { user, error: null }
}

const ALL_READ: Permission[] = ['house:read', 'budget:read', 'document:read']
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    ...ALL_READ, 'house:write', 'house:delete', 'house:manage_members', 'task:write',
    'stage:complete', 'budget:write', 'document:upload', 'document:delete',
    'progress:submit', 'progress:verify', 'decision:write',
  ],
  FAMILY_MEMBER: [...ALL_READ, 'task:write', 'decision:write', 'progress:submit', 'document:upload'],
  CONTRACTOR: [...ALL_READ, 'task:write', 'progress:submit', 'document:upload'],
  ARCHITECT: [...ALL_READ, 'decision:write', 'document:upload', 'progress:submit'],
}

export async function requireHouseAccess(houseId: string, permission: Permission) {
  const { user, error } = await requireAuth()
  if (error || !user) return { user: null, error: error ?? json('Not authenticated', 401) }

  // Admins can do everything on every house.
  if (user.role === 'ADMIN') return { user, error: null }

  const house = await prisma.house.findUnique({ where: { id: houseId }, select: { ownerId: true } })
  if (!house) return { user: null, error: json('House not found', 404) }

  let role: string | undefined = house.ownerId === user.id ? 'OWNER' : undefined
  if (!role) {
    const member = await prisma.houseMember.findUnique({
      where: { houseId_userId: { houseId, userId: user.id } },
    })
    role = member?.role
  }
  if (!role) return { user: null, error: json('Forbidden', 403) }
  if (!ROLE_PERMISSIONS[role]?.includes(permission)) return { user: null, error: json('Forbidden', 403) }
  return { user, error: null }
}
