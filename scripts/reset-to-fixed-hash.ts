
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
    const password = "Fitness@123";
    console.log(`Generating hash for password: ${password}`);

    // Explicitly using bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log(`Generated Hash: ${hash}`);

    console.log("Updating ALL users with this hash...");

    const { data, error } = await supabase
        .from("user_preferences")
        .update({
            password_hash: hash,
            password_change_required: true
        })
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");

    if (error) {
        console.error("Error updating users:", error.message);
    } else {
        console.log(`Successfully updated ${data?.length} users.`);

        // Verification step
        console.log("Verifying immediate read-back...");
        const { data: verifyData } = await supabase
            .from("user_preferences")
            .select("password_hash")
            .limit(1)
            .single();

        if (verifyData) {
            console.log(`Read back hash: ${verifyData.password_hash}`);
            const match = await bcrypt.compare(password, verifyData.password_hash);
            console.log(`Immediate Verification (bcryptjs.compare): ${match}`);
        }
    }
}

resetPassword();
