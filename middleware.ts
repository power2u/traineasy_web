import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = withAuth(
    function middleware(req) {
        // Custom logic
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isMembershipExpiredPage = req.nextUrl.pathname === '/membership-expired';
        const isPublicPage = req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/auth') || req.nextUrl.pathname.startsWith('/info');

        // Logic: specific handling for non-admin users without active membership
        // Admins are exempt from membership checks
        if (isAuth && token?.role !== 'super_admin') {
            const hasActiveMembership = (token as any).hasActiveMembership;

            // If membership is NOT active, and trying to access protected pages
            if (!hasActiveMembership) {
                if (!isMembershipExpiredPage && !isPublicPage) {
                    // Redirect to membership expired page
                    return NextResponse.redirect(new URL('/membership-expired', req.url));
                }
            }
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const isAuth = !!token;
                const path = req.nextUrl.pathname;

                // Maintenance page should be public if mode is on, but we handle that in the wrapper
                if (path === '/maintenance') return true;

                // Public paths that don't require auth
                if (path === '/' || path.startsWith('/auth') || path.startsWith('/info') || path.startsWith('/api/auth') || path.startsWith('/api/cron') || path === '/membership-expired') {
                    return true;
                }

                // Protected paths require auth
                return isAuth;
            },
        },
        pages: {
            signIn: "/auth/login",
        },
    }
);

export default function middleware(req: NextRequest) {
    // 1. Maintenance Mode Check - REMOVED redirect, now handled by MaintenanceBanner
    /*
    if (process.env.MAINTENANCE_MODE === 'true') {
        const path = req.nextUrl.pathname;
        if (path === '/maintenance') return NextResponse.next();
        if (path.startsWith('/_next') || path.startsWith('/static') || path.startsWith('/favicon.ico')) return NextResponse.next();
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }
    */

    // 2. Redirect /maintenance to / as we now use a banner
    if (req.nextUrl.pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/', req.url));
    }

    // 3. Standard Auth Middleware
    return (authMiddleware as any)(req);
}

export const config = {
    matcher: [
        // Match all paths to ensure we can capture for maintenance
        // Excluding internal Next.js paths and static files
        '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
};
