import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_COOKIE, isValidProfileId } from '@/lib/demo-profiles'

// Gatekeeper for the demo: a valid `demo_profile_id` cookie is the only requirement.
export function proxy(request: NextRequest) {
  const profile = request.cookies.get(DEMO_COOKIE)?.value
  const valid = isValidProfileId(profile)
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    // ?reset=1 means a page couldn't find the demo user in the DB: drop the cookie, show the picker.
    if (request.nextUrl.searchParams.has('reset')) {
      const res = NextResponse.next()
      res.cookies.delete(DEMO_COOKIE)
      return res
    }
    if (valid) return NextResponse.redirect(new URL('/dashboard', request.url))
    // Clear a stale/invalid cookie so the picker never loops.
    const res = NextResponse.next()
    if (profile) res.cookies.delete(DEMO_COOKIE)
    return res
  }

  if (!valid) {
    const res = NextResponse.redirect(new URL('/', request.url))
    if (profile) res.cookies.delete(DEMO_COOKIE)
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/houses/:path*', '/providers/:path*', '/notifications/:path*', '/admin/:path*'],
}
