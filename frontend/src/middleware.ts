import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Learnify Edge Middleware
 *
 * Strict top-down boolean logic pattern:
 *   1. Is the path public?
 *   2. Does the user have a valid (non-expired) token?
 *   3. Apply the four routing rules.
 */

// ── JWT Helpers ────────────────────────────────────────────────

interface JwtPayload {
  id?: string;
  role?: string;
  exp?: number;
  entitlements?: {
    learnify?: boolean;
    doctorsQuizz?: boolean;
  };
}

/**
 * Edge-compatible JWT decoder with expiry validation.
 * Does NOT verify the signature (that happens on the backend).
 * Returns null for malformed, missing, OR expired tokens.
 */
const decodeJwt = (raw: string): JwtPayload | null => {
  try {
    const segment = raw.split('.')[1];
    if (!segment) return null;

    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = atob(padded);
    const payload: JwtPayload = JSON.parse(json);

    // Reject expired tokens — this is the key fix for the redirect loop.
    // A stale cookie with a structurally valid but expired JWT was causing
    // the middleware to redirect /login → /dashboard → /login endlessly.
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

// ── Middleware ──────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Identify if the user is trying to access a public route.
  const isPublicPath =
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/auth-success');

  // 2. Safely extract and validate the token from cookies.
  //    The app sets `accessToken`; `token` is a legacy fallback.
  const rawToken =
    request.cookies.get('accessToken')?.value ||
    request.cookies.get('token')?.value ||
    '';
  const decoded = rawToken ? decodeJwt(rawToken) : null;
  const hasValidToken = decoded !== null;

  // 3. RULE: On a public path + logged in → kick to dashboard.
  if (isPublicPath && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. RULE: On a public path + NOT logged in → let them through.
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 5. RULE: Protected path + NOT logged in → kick to login.
  if (!hasValidToken) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(path)}`, request.url),
    );
  }

  // ── From here on: user has a valid, non-expired token ────────

  const isAdmin = decoded.role === 'ADMIN';
  const entitlements = decoded.entitlements ?? {};

  // 6. Admin gate — only ADMINs may enter /admin/*.
  if (path.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 7. DoctorsQuizz entitlement gate.
  const needsDoctorsQuizz =
    path.startsWith('/quiz') || path.startsWith('/dashboard/quizzes');
  if (needsDoctorsQuizz && !isAdmin && entitlements.doctorsQuizz !== true) {
    return NextResponse.redirect(
      new URL('/dashboard?alert=access_restricted', request.url),
    );
  }

  // 8. Learnify entitlement gate.
  const needsLearnify =
    path.startsWith('/courses') ||
    path.startsWith('/my-courses') ||
    path.startsWith('/workshops') ||
    path.startsWith('/dashboard/courses');
  if (needsLearnify && !isAdmin && entitlements.learnify !== true) {
    return NextResponse.redirect(
      new URL('/dashboard?alert=access_restricted', request.url),
    );
  }

  // 9. All checks passed — let them proceed.
  return NextResponse.next();
}

// ── Strict Matcher Configuration ───────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
