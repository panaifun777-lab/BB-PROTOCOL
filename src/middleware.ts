// ── BB Protocol: Next.js Middleware ──
// Handles API authentication, CORS, rate limiting, and request logging.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Configuration ──
const PUBLIC_PATHS = ['/api/health'];
const PUBLIC_STRIPE_PATHS = ['/api/stripe/webhook'];
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 100; // max requests per window

// In-memory rate limiter (resets on server restart; use Redis for production)
const ipRequests = new Map<string, { count: number; resetAt: number }>();

// ── Rate Limiter ──
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ── API Key Validation (optional — only enforced when REQUIRE_API_KEY env is set) ──
function validateApiKey(request: NextRequest): boolean {
  if (!process.env.REQUIRE_API_KEY) {
    return true; // allow all requests when API key enforcement is disabled
  }
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey.length < 8) {
    return false;
  }
  return true;
}

// ── CORS Headers ──
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Middleware ──
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';

  // ── CORS Preflight ──
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  // ── Public Paths (no auth required) ──
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Stripe Webhook (needs raw body, skip auth) ──
  if (PUBLIC_STRIPE_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── API Routes: Apply auth and rate limiting ──
  if (pathname.startsWith('/api/')) {
    // Rate Limiting
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: getCorsHeaders(request) }
      );
    }

    // API Key Validation
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_API_KEY' },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }
  }

  // ── Non-API routes: Pass through ──
  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

// ── Matcher (only run on API routes) ──
export const config = {
  matcher: '/api/:path*',
};
