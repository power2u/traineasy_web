import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setPassword() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log("Usage: npx tsx scripts/set-user-password.ts <email> <password>");
        console.log("       npx tsx scripts/set-user-password.ts --all <default_password>");
        process.exit(1);
    }

    const [target, password] = args;

    if (!password) {
        console.error("Error: Password is required.");
        process.exit(1);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    if (target === "--all") {
        console.log(`WARNING: This will set the password for ALL users in user_preferences to '${password}'.`);
        console.log("Waiting 5 seconds... Press Ctrl+C to cancel.");
        await new Promise(resolve => setTimeout(resolve, 5000));

        const { data, error } = await supabase
            .from("user_preferences")
            .update({
                password_hash: passwordHash,
                password_change_required: true
            })
            .neq("id", "00000000-0000-0000-0000-000000000000") // simple filter to ensure valid update
            .select("id");

        const count = data?.length ?? 0;

        if (error) {
            console.error("Error updating passwords:", error.message);
        } else {
            console.log(`Successfully updated passwords for ${count} users.`);
        }

    } else {
        // Target is an email
        const email = target;
        console.log(`Setting password for user: ${email}`);

        // First check if user exists
        const { data: user, error: findError } = await supabase
            .from("user_preferences")
            .select("id, email")
            .eq("email", email)
            .single();

        if (findError || !user) {
            console.error(`User with email '${email}' not found in user_preferences.`);
            process.exit(1);
        }

        const { error: updateError } = await supabase
            .from("user_preferences")
            .update({
                password_hash: passwordHash,
                password_change_required: true
            })
            .eq("id", user.id);

        if (updateError) {
            console.error("Error updating password:", updateError.message);
        } else {
            console.log(`Success! Password updated for ${email}`);
        }
    }
}

setPassword().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
