import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Redis client - requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

// Check if rate limiting is enabled (both env vars must be set)
export const isRateLimitEnabled = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// Rate limiters for different endpoint categories
// Using sliding window algorithm for smooth rate limiting

// Public endpoints (search, printings) - more lenient
export const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 requests per minute
  prefix: 'ratelimit:public',
  analytics: true,
})

// Authenticated read endpoints - moderate limits
export const authReadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  prefix: 'ratelimit:auth:read',
  analytics: true,
})

// Authenticated write endpoints (POST/PUT/DELETE) - stricter
export const authWriteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
  prefix: 'ratelimit:auth:write',
  analytics: true,
})

// Intensive operations (compute, bulk-import) - very strict
export const intensiveLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  prefix: 'ratelimit:intensive',
  analytics: true,
})

// Endpoint category mapping
type EndpointCategory = 'public' | 'auth-read' | 'auth-write' | 'intensive'

const endpointCategories: Record<string, EndpointCategory> = {
  // Public endpoints
  '/api/cards/search': 'public',
  '/api/cards/printings': 'public',

  // Intensive endpoints (most restrictive)
  '/api/matches/compute': 'intensive',
  '/api/cards/bulk-import': 'intensive',
  '/api/cards/bulk-import-wishlist': 'intensive',
  '/api/cards/bulk-match': 'intensive',

  // Write endpoints (need to specify POST/PUT/DELETE)
  '/api/push/subscribe': 'auth-write',
  '/api/push/unsubscribe': 'auth-write',
  '/api/cards/upsert': 'auth-write',
  '/api/preferences/global-discount': 'auth-write',
}

// Patterns for dynamic routes
const dynamicPatterns: Array<{ pattern: RegExp; category: EndpointCategory; methods?: string[] }> = [
  // Match actions (write operations)
  { pattern: /^\/api\/matches\/[^/]+\/request$/, category: 'auth-write' },
  { pattern: /^\/api\/matches\/[^/]+\/confirm$/, category: 'auth-write' },
  { pattern: /^\/api\/matches\/[^/]+\/complete$/, category: 'auth-write' },
  { pattern: /^\/api\/matches\/[^/]+\/restore$/, category: 'auth-write' },
  { pattern: /^\/api\/matches\/[^/]+\/recalculate$/, category: 'intensive' },
  { pattern: /^\/api\/matches\/[^/]+\/comments$/, category: 'auth-write', methods: ['POST'] },
  { pattern: /^\/api\/matches\/[^/]+\/cards/, category: 'auth-write', methods: ['POST', 'PUT', 'DELETE'] },
]

function getEndpointCategory(pathname: string, method: string): EndpointCategory {
  // Check exact matches first
  const exactMatch = endpointCategories[pathname]
  if (exactMatch) {
    return exactMatch
  }

  // Check dynamic patterns
  for (const { pattern, category, methods } of dynamicPatterns) {
    if (pattern.test(pathname)) {
      // If methods are specified, only match those methods
      if (methods && !methods.includes(method)) {
        continue
      }
      return category
    }
  }

  // Default: auth-write for POST/PUT/DELETE, auth-read for GET
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return 'auth-write'
  }

  return 'auth-read'
}

function getLimiter(category: EndpointCategory): Ratelimit {
  switch (category) {
    case 'public':
      return publicLimiter
    case 'auth-read':
      return authReadLimiter
    case 'auth-write':
      return authWriteLimiter
    case 'intensive':
      return intensiveLimiter
  }
}

// Get identifier for rate limiting (IP address or user ID if authenticated)
export function getIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID for authenticated requests (more accurate)
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Main rate limit check function
export async function checkRateLimit(
  request: NextRequest,
  userId?: string
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow all requests
  if (!isRateLimitEnabled()) {
    return { success: true, limit: 0, remaining: 0, reset: 0 }
  }

  const pathname = request.nextUrl.pathname
  const method = request.method
  const category = getEndpointCategory(pathname, method)
  const limiter = getLimiter(category)
  const identifier = getIdentifier(request, userId)

  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// Create rate limit exceeded response
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      message: 'Has excedido el límite de solicitudes. Por favor, esperá un momento antes de intentar de nuevo.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    }
  )
}

// Helper to add rate limit headers to successful responses
export function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  if (result.limit > 0) {
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())
  }
  return response
}
