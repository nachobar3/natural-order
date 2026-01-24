import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, rateLimitResponse, addRateLimitHeaders, isRateLimitEnabled } from '@/lib/rate-limit'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Apply rate limiting only to API routes
  if (pathname.startsWith('/api/')) {
    // Check rate limit (works with or without auth)
    // Note: For public endpoints, we use IP-based limiting
    // For auth endpoints, the rate limit uses IP until we get user ID from supabase
    const rateLimitResult = await checkRateLimit(request)

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Continue with the request, adding rate limit headers to the response
    const response = NextResponse.next()
    if (isRateLimitEnabled()) {
      return addRateLimitHeaders(response, rateLimitResult)
    }
    return response
  }

  // For non-API routes, handle session management
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
