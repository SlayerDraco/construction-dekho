import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { deleteCategory, updateCategory } from '@/lib/directory/categories-service'
import { handleRouteError } from '@/lib/directory/errors'
import { categoryUpdateSchema } from '@/lib/directory/validation'

const idSchema = z.string().uuid()

async function guard() {
  const { user, error } = await requireAdmin()
  if (error) return { error }
  const rl = rateLimit(`business-categories:write:${user!.id}`, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return { error: NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }) }
  return { user: user! }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if ('error' in g) return g.error
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  try {
    const id = idSchema.parse((await params).id)
    return NextResponse.json(await updateCategory(id, categoryUpdateSchema.parse(body), g.user.id))
  } catch (e) {
    return handleRouteError(e)
  }
}

/** DELETE removes an unused category. Categories in use must be deactivated via PATCH { isActive: false }. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard()
  if ('error' in g) return g.error
  try {
    const id = idSchema.parse((await params).id)
    const reason = request.nextUrl.searchParams.get('reason') ?? undefined
    return NextResponse.json(await deleteCategory(id, g.user.id, reason?.slice(0, 500)))
  } catch (e) {
    return handleRouteError(e)
  }
}
