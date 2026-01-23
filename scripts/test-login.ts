
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

async function testLogin(email: string, password: string) {
    console.log(`Testing login for: ${email} with password: ${password}`);

    const { data: user, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("email", email)
        .single();

    if (error || !user) {
        console.error("User lookup failed:", error?.message || "User not found");
        return;
    }

    console.log("User found:", user.id);
    console.log("Stored hash:", user.password_hash);

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log("Password match result:", passwordMatch);

    if (passwordMatch) {
        console.log("LOGIN SUCCESS!");
    } else {
        console.log("LOGIN FAILED: Password mismatch");

        // Debug: hash the password again and see
        const newHash = await bcrypt.hash(password, 10);
        console.log("New hash of input password:", newHash);
    }
}

const email = process.argv[2] || "jaspreet.codrity@gmail.com";
const password = process.argv[3] || "Fitness@123";

testLogin(email, password);
