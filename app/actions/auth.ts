'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function updatePasswordAndResetFlag(newPassword: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return { success: false, error: "Not authenticated" };
        }

        const userId = (session.user as any).id;

        // Hash the new password using bcryptjs to be compatible with login check
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.userPreference.update({
            where: { id: userId },
            data: {
                passwordHash: hashedPassword,
                passwordChangeRequired: false
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Exception updating password:", error);
        return { success: false, error: error.message };
    }
}
