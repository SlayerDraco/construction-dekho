import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getCategoryTree, listCategories } from '@/lib/directory/categories-service'
import { handleRouteError } from '@/lib/directory/errors'
import { categoryQuerySchema } from '@/lib/directory/validation'

/**
 * Category taxonomy for dropdowns and filters. Reads from the database; never hard-coded.
 * Stage is a ranking hint only: no category is ever hidden because of a project's stage.
 *
 * GET /api/business-categories?view=tree|flat&q=&parentId=&stageId=&includeStages=&page=&limit=
 */
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth()
  if (error) return error

  const rl = rateLimit(`business-categories:${user!.id}`, { limit: 120, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  try {
    const query = categoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const isAdmin = user!.role === 'ADMIN'

    if (query.view === 'tree' && !query.q && !query.parentId) {
      const tree = await getCategoryTree({ includeInactive: query.includeInactive && isAdmin, includeStages: query.includeStages, stageId: query.stageId })
      return NextResponse.json({ view: 'tree', ...tree })
    }
    return NextResponse.json({ view: 'flat', ...(await listCategories(query, { isAdmin })) })
  } catch (e) {
    return handleRouteError(e)
  }
}
