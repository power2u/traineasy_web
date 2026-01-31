import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Enhanced error handling for production
function handleAuthError(error: any, context: string): void {
    console.error(`[Auth Error - ${context}]:`, {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
    });
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    console.log("[Auth] Starting authorization for:", credentials?.email);

                    if (!credentials?.email || !credentials?.password) {
                        console.log("[Auth] Missing credentials");
                        return null;
                    }



                    const user = await prisma.userPreference.findUnique({
                        where: { email: credentials.email },
                    });

                    if (!user) {
                        console.log("[Auth] User not found in database");
                        return null;
                    }

                    console.log("[Auth] User found:", user.id);

                    const passwordMatch = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    );

                    console.log("[Auth] Password match result:", passwordMatch);

                    if (!passwordMatch) {
                        console.log("[Auth] Password mismatch");
                        return null;
                    }

                    // Check for ban
                    if (user.bannedUntil && user.bannedUntil > new Date()) {
                        console.log("[Auth] User is banned until:", user.bannedUntil);
                        return null;
                    }

                    // Auto-verify email on successful login
                    const updateData: any = {
                        lastSignInAt: new Date(),
                        lastActiveAt: new Date(),
                    };

                    if (!user.emailVerified) {
                        updateData.emailVerified = new Date();
                        console.log("[Auth] Auto-verifying email for user:", user.email);
                    }

                    // Update user stats
                    try {
                        await prisma.userPreference.update({
                            where: { id: user.id },
                            data: updateData,
                        });
                        console.log("[Auth] Successfully updated user stats:", user.id);
                    } catch (updateError) {
                        handleAuthError(updateError, "Update Sign-in Stats");
                        // Don't fail auth if this update fails
                    }

                    console.log("[Auth] Authorize returning:", {
                        id: user.id,
                        role: user.role,
                        email: user.email
                    });

                    return {
                        id: user.id,
                        role: user.role as 'user' | 'super_admin',
                        name: user.fullName,
                        email: user.email,
                        password_change_required: user.passwordChangeRequired,
                    };
                } catch (error) {
                    handleAuthError(error, "Authorization");
                    return null;
                } finally {
                    // Database connection is managed by the singleton in lib/prisma.ts
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            try {
                // Initial sign in
                if (user) {
                    console.log("[Auth] JWT: User object present on sign-in:", JSON.stringify(user));
                    token.id = user.id;
                    token.role = user.role;
                    token.name = user.name;
                    token.password_change_required = user.password_change_required;
                }

                // Failsafe: if role is missing but we have email, try to fetch it
                if (!token.role && token.email) {
                    console.log("[Auth] JWT: Role missing for email:", token.email, "Fetching from DB...");
                    try {
                        const userPref = await prisma.userPreference.findUnique({
                            where: { email: token.email },
                            select: { role: true },
                        });

                        if (userPref?.role) {
                            console.log("[Auth] JWT: Role fetched successfully:", userPref.role);
                            token.role = userPref.role as 'user' | 'super_admin';
                        }
                    } catch (err) {
                        handleAuthError(err, "JWT Role Fetch");
                    }
                }

                // Fetch Active Membership Status (if not already set or on update)
                if (token.id && token.hasActiveMembership === undefined) {
                    // Optimization: Admins always have active membership access
                    if (token.role === 'super_admin') {
                        token.hasActiveMembership = true;
                    } else {
                        try {
                            // Check for ANY active membership
                            const membership = await prisma.userMembership.findFirst({
                                where: {
                                    userId: token.id as string,
                                    status: "active",
                                },
                                select: { status: true },
                            });

                            // If we found a row with status 'active', they have a membership
                            token.hasActiveMembership = !!membership;
                        } catch (err) {
                            handleAuthError(err, "JWT Membership Fetch");
                            token.hasActiveMembership = false;
                        }
                    }
                }

                if (trigger === "update" && session) {
                    // Allow client to update the session (e.g. after password change)
                    if (session.user) {
                        token.password_change_required = session.user.password_change_required;
                        if (session.user.role) token.role = session.user.role;
                        // Allow manual update of membership status if needed
                        if (session.user.hasActiveMembership !== undefined) {
                            token.hasActiveMembership = session.user.hasActiveMembership;
                        }
                    }
                }
                return token;
            } catch (error) {
                handleAuthError(error, "JWT Callback");
                return token; // Return existing token on error
            }
        },
        async session({ session, token }) {
            try {
                if (token && session.user) {
                    session.user.id = token.id as string;
                    session.user.name = token.name as string;
                    session.user.role = token.role as 'user' | 'super_admin';
                    session.user.password_change_required = token.password_change_required as boolean;
                    session.user.hasActiveMembership = token.hasActiveMembership as boolean;
                }
                return session;
            } catch (error) {
                handleAuthError(error, "Session Callback");
                return session; // Return existing session on error
            }
        },
    },
    pages: {
        signIn: "/auth/login",
    },
};
