'use server';

import { createClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function updatePasswordAndResetFlag(newPassword: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Not authenticated" };
        }

        const userId = (session.user as any).id;

        // Hash the new password using bcryptjs to be compatible with login check
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const supabase = await createClient(); // Use server client

        // Using admin client would be better but if user is logged in, 
        // they might not have permission to update their own password_change_required flag depending on likely RLS.
        // HOWEVER, standard users usually can update their own password.
        // Resetting the flag might require admin privileges or a specific RLS policy.
        // Let's assume we need admin privileges to force the flag reset if RLS is strict.
        // But let's try with standard client first, if it fails we might need admin client.
        // Actually, let's just use the Admin client to be safe and sure.

        // Dynamic import to avoid circular dep issues in some project structures, or just import from where it is.
        // We verified fcm-actions uses @/lib/supabase/admin, so we can use it too.

        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();

        const { error } = await adminClient
            .from("user_preferences")
            .update({
                password_hash: hashedPassword,
                password_change_required: false
            })
            .eq("id", userId);

        if (error) {
            console.error("Error updating password:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Exception updating password:", error);
        return { success: false, error: error.message };
    }
}
