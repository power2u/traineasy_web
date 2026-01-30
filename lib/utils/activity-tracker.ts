import { prisma } from "@/lib/prisma";

export async function updateLastActive(userId: string) {
    try {
        // Fire and forget - don't await the result to avoid blocking the main action
        prisma.userPreference.update({
            where: { id: userId },
            data: { lastActiveAt: new Date() }
        }).catch((error) => {
            console.error("Failed to update lastActiveAt:", error);
        });
    } catch (error) {
        console.error("Error in updateLastActive:", error);
    }
}
