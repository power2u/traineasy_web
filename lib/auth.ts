import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

                    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) console.error("[Auth] CRITICAL: MISSING NEXT_PUBLIC_SUPABASE_URL");
                    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.error("[Auth] CRITICAL: MISSING SUPABASE_SERVICE_ROLE_KEY");

                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    const { data: user, error } = await supabase
                        .from("user_preferences")
                        .select("*")
                        .eq("email", credentials.email)
                        .single();

                    if (error) {
                        console.error("[Auth] Database error:", error);
                        console.log("[Auth] User lookup failed:", error.message);
                        return null;
                    }

                    if (!user) {
                        console.log("[Auth] User not found in database");
                        return null;
                    }

                    console.log("[Auth] User found:", user.id);
                    console.log("[Auth] Stored hash from DB:", user.password_hash);

                    console.log("[Auth] Received password length:", credentials.password.length);
                    console.log("[Auth] Received password (first 3 chars):", credentials.password.substring(0, 3));
                    // console.log("[Auth] FULL PASSWORD CHECK:", credentials.password); 

                    const passwordMatch = await bcrypt.compare(
                        credentials.password,
                        user.password_hash
                    );

                    console.log("[Auth] Password match result:", passwordMatch);

                    if (!passwordMatch) {
                        console.log("[Auth] Password mismatch");
                        return null;
                    }

                    // Update last_sign_in_at
                    const { error: updateError } = await supabase
                        .from("user_preferences")
                        .update({ last_sign_in_at: new Date().toISOString() })
                        .eq("id", user.id);

                    if (updateError) {
                        console.error("[Auth] Failed to update sign-in time:", updateError);
                        // Non-blocking error
                    } else {
                        console.log("[Auth] Successfully updated last_sign_in_at for user:", user.id);
                    }

                    console.log("[Auth] Authorize returning:", {
                        id: user.id,
                        role: user.role,
                        email: user.email
                    });

                    return {
                        id: user.id,
                        role: user.role,
                        name: user.full_name,
                        email: user.email,
                        password_change_required: user.password_change_required,
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
            // console.log("[Auth] JWT Callback triggered");
            // Initial sign in
            if (user) {
                console.log("[Auth] JWT: User object present on sign-in:", JSON.stringify(user));
                token.id = user.id;
                token.role = user.role;
                token.password_change_required = user.password_change_required;
            } else {
                // console.log("[Auth] JWT: No user object (subsequent call). Token keys:", Object.keys(token));
                // console.log("[Auth] JWT: Token email:", token.email);
                // console.log("[Auth] JWT: Token role:", token.role);
            }

            // Failsafe: if role is missing but we have email, try to fetch it
            if (!token.role && token.email) {
                console.log("[Auth] JWT: Role missing for email:", token.email, "Fetching from DB...");
                try {
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    const { data: userPref } = await supabase
                        .from("user_preferences")
                        .select("role")
                        .eq("email", token.email)
                        .single();

                    if (userPref?.role) {
                        console.log("[Auth] JWT: Role fetched successfully:", userPref.role);
                        token.role = userPref.role;
                    }
                } catch (err) {
                    console.error("[Auth] JWT: Failed to fetch fallback role", err);
                }
            }

            if (trigger === "update" && session) {
                // Allow client to update the session (e.g. after password change)
                if (session.user) {
                    token.password_change_required = session.user.password_change_required;
                    if (session.user.role) token.role = session.user.role;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as 'user' | 'super_admin';
                session.user.password_change_required = token.password_change_required as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
    },
};
