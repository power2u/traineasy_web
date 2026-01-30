import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
                    // console.log("[Auth] Stored hash from DB:", user.passwordHash);

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
                        return null; // Or throw Error("Your account has been suspended.")
                    }

                    // Update last_sign_in_at
                    try {
                        await prisma.userPreference.update({
                            where: { id: user.id },
                            data: {
                                lastSignInAt: new Date(),
                                lastActiveAt: new Date(),
                            },
                        });
                        console.log("[Auth] Successfully updated last_sign_in_at for user:", user.id);
                    } catch (updateError) {
                        console.error("[Auth] Failed to update sign-in time:", updateError);
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
                    console.error("[Auth] UNEXPECTED ERROR in authorize:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                console.log("[Auth] JWT: User object present on sign-in:", JSON.stringify(user));
                token.id = user.id;
                token.role = user.role;
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
                    console.error("[Auth] JWT: Failed to fetch fallback role", err);
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
                        console.error("[Auth] JWT: Failed to fetch membership status", err);
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
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as 'user' | 'super_admin';
                session.user.password_change_required = token.password_change_required as boolean;
                session.user.hasActiveMembership = token.hasActiveMembership as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
};
