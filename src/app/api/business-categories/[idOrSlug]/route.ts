import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getCategory } from '@/lib/directory/categories-service'
import { handleRouteError } from '@/lib/directory/errors'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const { user, error } = await requireAuth()
  if (error) return error
  try {
    const { idOrSlug } = await params
    return NextResponse.json(await getCategory(idOrSlug, { isAdmin: user!.role === 'ADMIN' }))
  } catch (e) {
    return handleRouteError(e)
  }
}
