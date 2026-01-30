
import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function resetPassword() {
    const password = "Fitness@123";
    console.log(`Generating hash for password: ${password}`);

    try {
        // Explicitly using bcryptjs
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        console.log(`Generated Hash: ${hash}`);

        console.log("Updating ALL users with this hash...");

        const result = await prisma.userPreference.updateMany({
            data: {
                passwordHash: hash,
                passwordChangeRequired: true,
            },
        });

        console.log(`Successfully updated ${result.count} users.`);

        // Verification step
        console.log("Verifying immediate read-back...");
        const verifyUser = await prisma.userPreference.findFirst({
            select: { passwordHash: true },
        });

        if (verifyUser) {
            console.log(`Read back hash: ${verifyUser.passwordHash}`);
            const match = await bcrypt.compare(password, verifyUser.passwordHash);
            console.log(`Immediate Verification (bcryptjs.compare): ${match}`);
        }
    } catch (error: any) {
        console.error("Error updating users:", error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
