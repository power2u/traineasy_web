import { prisma } from '@/lib/prisma';

export interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: Date;
  amount: number; // in ml
  glassCount: number;
  createdAt: Date;
}

export class WaterService {
  /**
   * Get today's water intake entries for a user
   */
  static async getTodayEntries(userId: string): Promise<WaterIntakeEntry[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const data = await prisma.waterIntake.findMany({
      where: {
        userId: userId,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    return data.map((entry: { id: any; userId: any; timestamp: any; amount: any; glassCount: any; createdAt: any; }) => ({
      id: entry.id,
      userId: entry.userId,
      timestamp: entry.timestamp,
      amount: entry.amount || 250,
      glassCount: entry.glassCount,
      createdAt: entry.createdAt,
    }));
  }

  /**
   * Get all water intake entries for a user
   */
  static async getAllEntries(userId: string, limit = 50): Promise<WaterIntakeEntry[]> {
    const data = await prisma.waterIntake.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return data.map((entry: { id: any; userId: any; timestamp: any; amount: any; glassCount: any; createdAt: any; }) => ({
      id: entry.id,
      userId: entry.userId,
      timestamp: entry.timestamp,
      amount: entry.amount || 250,
      glassCount: entry.glassCount,
      createdAt: entry.createdAt,
    }));
  }

  /**
   * Add a water intake entry
   */
  static async addEntry(userId: string, amount: number = 250): Promise<WaterIntakeEntry> {
    // Assuming 250ml per glass for now if calculating glass count, 
    // or we might need to update the interface to accept glassCount instead.
    // The previous implementation took amount/250 implies 1 glass? 
    // Actually the previous implementation just inserted amount and let glass_count default to 1?
    // Let's assume standard glass size for now or check if we need to fetch user pref.
    // For simplicity matching previous behavior:

    const data = await prisma.waterIntake.create({
      data: {
        userId: userId,
        amount: amount,
        glassCount: 1, // Defaulting to 1 as per previous implicit behavior or schema default
        timestamp: new Date(),
      }
    });

    return {
      id: data.id,
      userId: data.userId,
      timestamp: data.timestamp,
      amount: data.amount || 250,
      glassCount: data.glassCount,
      createdAt: data.createdAt,
    };
  }

  /**
   * Delete a water intake entry
   */
  static async deleteEntry(entryId: string): Promise<void> {
    await prisma.waterIntake.delete({
      where: {
        id: entryId
      }
    });
  }

  /**
   * Get today's water count (number of glasses)
   */
  static async getTodayCount(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.reduce((sum, entry) => sum + entry.glassCount, 0);
  }

  /**
   * Get today's total water amount in ml
   */
  static async getTodayTotal(userId: string): Promise<number> {
    const entries = await this.getTodayEntries(userId);
    return entries.reduce((sum, entry) => sum + (entry.amount || 250), 0);
  }
}
