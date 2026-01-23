import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password, full_name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if user exists
        const { data: existing } = await supabase
            .from("user_preferences")
            .select("id")
            .eq("email", email)
            .single();

        if (existing) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = crypto.randomUUID(); // Generate UUID

        // Create user in user_preferences
        const { error } = await supabase.from("user_preferences").insert({
            id: userId,
            email,
            password_hash: hashedPassword,
            full_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            notifications_enabled: true,
            meal_reminders_enabled: true,
            water_reminders_enabled: true,
            weight_reminders_enabled: true,
            preferred_unit: 'kg',
            goal_weight_unit: 'kg',
            daily_water_target: 8,
            glass_size_ml: 250,
            theme: 'system',
            language: 'en'
        });

        if (error) {
            console.error("Signup error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        console.error("Signup exception:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
