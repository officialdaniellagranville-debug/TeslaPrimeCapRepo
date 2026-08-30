import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Skip login page itself
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    // For all other /admin/* routes, check for an admin-specific token cookie.
    // If there's no adminToken cookie, redirect to /admin/login.
    // This provides a fast edge-level guard. The admin page itself does
    // a secondary client-side check that also verifies the role via /api/auth/me.
    //
    // NOTE: We do NOT block here if the cookie exists, because the cookie
    // might be stale. The admin page handles server-side verification.
    const adminToken = request.cookies.get('adminToken') || request.cookies.get('token');
    if (!adminToken || !adminToken.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Dashboard and protected routes — check for token cookie
  const protectedPaths = [
    '/dashboard', '/deposit', '/withdraw', '/investments',
    '/transactions', '/profile', '/security', '/kyc',
    '/notifications', '/referral', '/plans', '/market', '/support',
  ];

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const tokenCookie = request.cookies.get('token');
    if (!tokenCookie || !tokenCookie.value) {
      // No token cookie — redirect to login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/deposit/:path*', '/withdraw/:path*', '/investments/:path*', '/transactions/:path*', '/profile/:path*', '/security/:path*', '/kyc/:path*', '/notifications/:path*', '/referral/:path*', '/plans/:path*', '/market/:path*', '/support/:path*'],
};
