import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { syncClerkUser } from '@/lib/auth'

export async function POST(_request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ||
    'User'

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const profileImage = clerkUser.imageUrl

  const user = await syncClerkUser(userId, { fullName, email, profileImage })

  return NextResponse.json(user)
}

export async function GET(_request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { prisma } = await import('@/lib/prisma')
  const user = await prisma.user.findUnique({ where: { clerkId: userId } })

  if (!user) {
    return NextResponse.json({ error: 'User not found. Call POST /api/user to sync.' }, { status: 404 })
  }

  return NextResponse.json(user)
}

console.log(
  "DB HOST:",
  process.env.DATABASE_URL?.split("@")[1]?.split("/")[0]
)