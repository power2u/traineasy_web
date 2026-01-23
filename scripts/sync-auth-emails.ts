import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncEmails() {
    console.log("Starting email sync...");

    let hasMore = true;
    let page = 1;
    const perPage = 50;
    let updatedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage,
        });

        if (error) {
            console.error("Error fetching users from Auth:", error);
            break;
        }

        if (!users || users.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`Processing batch ${page} (${users.length} users)...`);

        for (const user of users) {
            if (!user.email) {
                console.log(`User ${user.id} has no email, skipping.`);
                continue;
            }

            // Check if user exists in user_preferences
            const { data: prefUser, error: fetchError } = await supabase
                .from("user_preferences")
                .select("id, email")
                .eq("id", user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'row not found'
                console.error(`Error checking user ${user.id} in preferences:`, fetchError.message);
                errorCount++;
                continue;
            }

            if (!prefUser) {
                console.log(`User ${user.id} (${user.email}) not found in user_preferences. Skipping.`);
                notFoundCount++;
                continue;
            }

            if (prefUser.email !== user.email) {
                console.log(`Updating email for ${user.id}: ${prefUser.email} -> ${user.email}`);

                const { error: updateError } = await supabase
                    .from("user_preferences")
                    .update({ email: user.email })
                    .eq("id", user.id);

                if (updateError) {
                    console.error(`Failed to update user ${user.id}:`, updateError.message);
                    errorCount++;
                } else {
                    updatedCount++;
                }
            } else {
                // console.log(`Email already matches for ${user.id}`);
            }
        }

        page++;
    }

    console.log("\nSync complete.");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Not found in preferences: ${notFoundCount}`);
}

syncEmails().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
