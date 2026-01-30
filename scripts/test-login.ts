
import * as dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function testLogin(email: string, password: string) {
    console.log(`Testing login for: ${email} with password: ${password}`);

    try {
        const user = await prisma.userPreference.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                fullName: true,
                passwordHash: true,
            },
        });

        if (!user) {
            console.error("User lookup failed: User not found");
            return;
        }

        console.log("User found:", user.id);
        console.log("User name:", user.fullName);
        console.log("Stored hash:", user.passwordHash);

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        console.log("Password match result:", passwordMatch);

        if (passwordMatch) {
            console.log("LOGIN SUCCESS!");
        } else {
            console.log("LOGIN FAILED: Password mismatch");

            // Debug: hash the password again and see
            const newHash = await bcrypt.hash(password, 10);
            console.log("New hash of input password:", newHash);
        }
    } catch (error: any) {
        console.error("Error during login test:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

const email = process.argv[2] || "jaspreet.codrity@gmail.com";
const password = process.argv[3] || "Fitness@123";

testLogin(email, password);
