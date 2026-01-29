import { createClient } from "@/lib/supabase/server";

export async function updateLastActive(userId: string) {
    try {
        const supabase = await createClient();
        // Fire and forget - don't await the result to avoid blocking the main action
        supabase
            .from("user_preferences")
            .update({ last_active_at: new Date().toISOString() })
            .eq("id", userId)
            .then(({ error }) => {
                if (error) console.error("Failed to update last_active_at:", error);
            });
    } catch (error) {
        console.error("Error in updateLastActive:", error);
    }
}
