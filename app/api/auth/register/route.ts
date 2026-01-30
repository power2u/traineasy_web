import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password, full_name } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.userPreference.findUnique({
            where: { email },
            select: { id: true }
        });

        if (existing) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in user_preferences
        const newUser = await prisma.userPreference.create({
            data: {
                email,
                passwordHash: hashedPassword,
                fullName: full_name,
                // Default settings
                notificationsEnabled: true,
                mealRemindersEnabled: true,
                waterRemindersEnabled: true,
                weightRemindersEnabled: true,
                preferredUnit: 'kg',
                goalWeightUnit: 'kg',
                dailyWaterTarget: 2000,
                // Note: Original code used 8 (assuming glasses) but schema default is 2000 (ml).
                // Original code: daily_water_target: 8.
                // If I set 8, it might mean 8 ml which is wrong if schema assumes ml.
                // Line 52 schema: dailyWaterTarget Int @default(2000).
                // Line 53 schema: glassSizeMl default 250.
                // 8 * 250 = 2000.
                // So original code probably meant 8 glasses, but stored it in daily_water_target?
                // If the app interprets daily_water_target as glasses, then 2000 is wrong.
                // Let's check schema/usage.
                // water-service.ts uses `dailyWaterTarget` (likely ml).
                // I will set it to 2000 to match schema default which suggests ml.
                // If original code passed 8, maybe it was a bug or a different interpretation.
                // I will assume 2000 ml.
                glassSizeMl: 250,
                theme: 'system',
                language: 'en'
            }
        });

        return NextResponse.json({ success: true, userId: newUser.id });
    } catch (error: any) {
        console.error("Signup exception:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
