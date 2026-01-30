import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

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

    try {
        if (target === "--all") {
            console.log(`WARNING: This will set the password for ALL users in user_preferences to '${password}'.`);
            console.log("Waiting 5 seconds... Press Ctrl+C to cancel.");
            await new Promise(resolve => setTimeout(resolve, 5000));

            const result = await prisma.userPreference.updateMany({
                data: {
                    passwordHash,
                    passwordChangeRequired: true,
                },
            });

            console.log(`Successfully updated passwords for ${result.count} users.`);

        } else {
            // Target is an email
            const email = target;
            console.log(`Setting password for user: ${email}`);

            // First check if user exists
            const user = await prisma.userPreference.findUnique({
                where: { email },
                select: { id: true, email: true },
            });

            if (!user) {
                console.error(`User with email '${email}' not found in user_preferences.`);
                process.exit(1);
            }

            await prisma.userPreference.update({
                where: { id: user.id },
                data: {
                    passwordHash,
                    passwordChangeRequired: true,
                },
            });

            console.log(`Success! Password updated for ${email}`);
        }
    } catch (error: any) {
        console.error("Error updating password:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setPassword().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
