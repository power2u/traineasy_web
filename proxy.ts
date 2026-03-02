import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers to add to all responses
 */
function addSecurityHeaders(response: NextResponse | undefined | null) {
    // Safety check: ensure we have a valid response object
    if (!response || !response.headers) {
        response = NextResponse.next();
    }

    // Content Security Policy
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://*.googleapis.com https://*.firebase.googleapis.com https://*.firebaseio.com; " +
        "worker-src 'self' blob:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self';"
    );

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=()'
    );

    // Prevent search engine indexing of sensitive pages
    const path = response.url ? new URL(response.url).pathname : '';
    if (path.startsWith('/auth') || path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/dashboard')) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
    }

    return response;
}



/**
 * Protected paths that require authentication
 */
const PROTECTED_PATHS = [
    '/dashboard',
    '/profile',
    '/meals',
    '/water',
    '/weight',
    '/measurements',
    '/user-details',
    '/user-profile-edit',
    '/admin'
];

/**
 * Admin-only paths
 */
const ADMIN_PATHS = [
    '/admin',
    '/dev',
    '/api/admin'
];

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = [
    '/',
    '/info',
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/membership-expired'
];

const authMiddleware = withAuth(
    function middleware(req) {
        try {
            // Custom logic
            const token = req.nextauth.token;
            const isAuth = !!token;
            const path = req.nextUrl.pathname;

            // Admin path protection
            if (ADMIN_PATHS.some(adminPath => path.startsWith(adminPath))) {
                if (!isAuth || token?.role !== 'super_admin') {
                    console.warn(`[Security] Unauthorized admin access attempt to ${path} by ${token?.email || 'anonymous'}`);
                    return NextResponse.redirect(new URL('/auth/login?error=admin_required', req.url));
                }
            }

            // Membership check for non-admin users
            if (isAuth && token?.role !== 'super_admin') {
                const hasActiveMembership = (token as any).hasActiveMembership;
                const isMembershipExpiredPage = path === '/membership-expired';
                const isPublicPage = PUBLIC_PATHS.includes(path) || path.startsWith('/auth');

                if (!hasActiveMembership && !isMembershipExpiredPage && !isPublicPage) {
                    return NextResponse.redirect(new URL('/membership-expired', req.url));
                }
            }

            return NextResponse.next();
        } catch (error) {
            console.error('[Middleware] Error in auth middleware:', error);
            // Return a safe fallback response
            return NextResponse.redirect(new URL('/auth/login?error=middleware_error', req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                try {
                    const isAuth = !!token;
                    const path = req.nextUrl.pathname;

                    // Always allow public paths
                    if (PUBLIC_PATHS.includes(path) || path.startsWith('/auth') || path.startsWith('/api/auth') || path.startsWith('/api/cron')) {
                        return true;
                    }

                    // Maintenance page should be public
                    if (path === '/maintenance') return true;

                    // Protected paths require authentication
                    if (PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath))) {
                        return isAuth;
                    }

                    // Default: require auth for unlisted paths
                    return isAuth;
                } catch (error) {
                    console.error('[Middleware] Error in authorized callback:', error);
                    return false; // Deny access on error
                }
            },
        },
        pages: {
            signIn: "/auth/login",
        },
    }
);

export default function middleware(req: NextRequest) {
    try {
        // 1. Redirect /maintenance to / as we now use a banner
        if (req.nextUrl.pathname === '/maintenance') {
            const response = NextResponse.redirect(new URL('/', req.url));
            return addSecurityHeaders(response);
        }

        // 3. Block direct access to sensitive API endpoints from browsers
        const path = req.nextUrl.pathname;
        if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
            const userAgent = req.headers.get('user-agent') || '';
            const isDirectBrowserAccess = userAgent.includes('Mozilla') && !req.headers.get('x-requested-with');

            if (isDirectBrowserAccess && req.method === 'GET') {
                console.warn(`[Security] Direct browser access to API endpoint blocked: ${path}`);
                return addSecurityHeaders(new NextResponse(
                    JSON.stringify({ error: 'Direct access not allowed' }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                ));
            }
        }

        // 4. Standard Auth Middleware
        const authResponse = (authMiddleware as any)(req);

        // 5. Add security headers to all responses
        if (authResponse instanceof NextResponse) {
            return addSecurityHeaders(authResponse);
        }

        // If authResponse is a promise, handle it
        if (authResponse && typeof authResponse.then === 'function') {
            return authResponse.then((response: any) => {
                // Ensure response is valid before adding headers
                if (response instanceof NextResponse) {
                    return addSecurityHeaders(response);
                }
                // Fallback if promise resolves to undefined/null
                return addSecurityHeaders(NextResponse.next());
            }).catch((err: any) => {
                console.error('[Middleware] Auth middleware promise failed:', err);
                return addSecurityHeaders(NextResponse.next());
            });
        }

        // Fallback for any other case (e.g. authMiddleware returned undefined/void)
        return addSecurityHeaders(NextResponse.next());
    } catch (error) {
        console.error('[Middleware] Unexpected error:', error);
        // Return a safe fallback response
        const fallbackResponse = NextResponse.redirect(new URL('/auth/login?error=middleware_error', req.url));
        return addSecurityHeaders(fallbackResponse);
    }
}

export const config = {
    matcher: [
        // Match all paths except static files and API routes that should be public
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
    ],
};
