import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { createCategory } from '@/lib/directory/categories-service'
import { handleRouteError } from '@/lib/directory/errors'
import { categoryCreateSchema } from '@/lib/directory/validation'

export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const rl = rateLimit(`business-categories:write:${user!.id}`, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  try {
    const input = categoryCreateSchema.parse(body)
    return NextResponse.json(await createCategory(input, user!.id), { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
