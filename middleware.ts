
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Custom logic if needed, e.g. role checks
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => {
                console.log("[Middleware] Token check:", token ? "Exists" : "Missing");
                if (token) {
                    console.log("[Middleware] Token Role:", (token as any).role);
                }
                return !!token;
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
        '/user-details/:path*'
    ],
};
