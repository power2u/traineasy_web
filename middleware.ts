import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
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

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/profile/:path*',
        '/water/:path*',
        '/meals/:path*',
        '/weight/:path*',
        '/measurements/:path*',
        '/admin/:path*',
        '/user-profile-edit/:path*',
        '/user-details/:path*',
        '/membership-expired'
    ],
};
