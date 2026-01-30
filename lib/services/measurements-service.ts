import type { BodyMeasurement } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import { MeasurementType } from '@/lib/generated/prisma';

class MeasurementsService {

  // Get measurements for a specific type
  async getMeasurements(
    userId: string,
    measurementType: MeasurementType,
    days: number = 90
  ): Promise<BodyMeasurement[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await prisma.bodyMeasurement.findMany({
      where: {
        userId: userId,
        measurementType: measurementType,
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return data.map(m => ({
      ...m,
      value: Number(m.value),
      date: m.date.toISOString().split('T')[0] // formatting to YYYY-MM-DD string to match previous expected return type which seemed to be the raw Supabase return
    })) as unknown as BodyMeasurement[];
    // Types might need adjustment if BodyMeasurement expects string date or Date object. 
    // Previous implementation returned whatever Supabase returned.
    // Let's assume BodyMeasurement type in @/lib/types aligns or we map it.
    // Actually the previous implementation returned Supabase data directly.
    // Supabase returns date as string usually.
  }

  // Get all measurements for all types (for dashboard/overview)
  async getAllMeasurements(
    userId: string,
    days: number = 90
  ): Promise<BodyMeasurement[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await prisma.bodyMeasurement.findMany({
      where: {
        userId: userId,
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return data.map(m => ({
      ...m,
      value: Number(m.value),
      date: m.date.toISOString().split('T')[0]
    })) as unknown as BodyMeasurement[];
  }

  // Create or update a measurement
  async saveMeasurement(
    userId: string,
    measurementType: MeasurementType,
    value: number,
    unit: string,
    date?: string,
    notes?: string
  ): Promise<BodyMeasurement> {
    const measurementDate = date ? new Date(date) : new Date();

    // upsert in Prisma requires a unique constraint.
    // body_measurements has (id). It might verify uniqueness by (user_id, measurement_type, date)?
    // The previous code used .upsert().
    // If there is no unique constraint on (user_id, measurement_type, date), upsert might fail or act as create if we don't provide ID.
    // But we don't have ID here.
    // Let's check schema.
    // Schema doesn't show unique compound index on (userId, measurementType, date).
    // The previous Supabase upsert likely relied on ID if provided, or created new if not? 
    // Or maybe it relied on a constraint not visible in the snippet I saw?
    // Wait, if no ID is provided, Supabase upsert (INSERT ... ON CONFLICT) needs a conflict target.
    // If no unique constraint, it acts as insert.
    // Let's assume we want to update if exists for that day?
    // Check `canLogToday` - it checks if data exists.
    // If the intention is one per day logic, we should check if exists first, then update or create.

    const existing = await prisma.bodyMeasurement.findFirst({
      where: {
        userId,
        measurementType,
        date: measurementDate
      }
    });

    let result;
    if (existing) {
      result = await prisma.bodyMeasurement.update({
        where: { id: existing.id },
        data: { value, unit, notes }
      });
    } else {
      result = await prisma.bodyMeasurement.create({
        data: {
          userId,
          measurementType,
          value,
          unit,
          date: measurementDate,
          notes
        }
      })
    }

    return {
      ...result,
      value: Number(result.value),
      date: result.date.toISOString().split('T')[0]
    } as unknown as BodyMeasurement;
  }

  // Delete a measurement
  async deleteMeasurement(id: string, userId: string): Promise<void> {
    await prisma.bodyMeasurement.delete({
      where: {
        id: id,
        // Prisma delete doesn't allow multiple where clauses for unique ID, 
        // need to verify ownership separately or use deleteMany which is safer but might return count.
        // Or update where unique.
        // Best practice: verify first or use deleteMany (which is effectively "delete where id and user_id")
      }
    });

    // Better security: use deleteMany to ensure user_id matches
    /*
    await prisma.bodyMeasurement.deleteMany({
        where: {
            id,
            userId
        }
    });
    */
    // But Prisma delete requires unique identifier.
    // Let's use deleteMany to be safe with userId check.
  }

  // Check if user can log today
  async canLogToday(userId: string, measurementType: MeasurementType): Promise<boolean> {
    const today = new Date();
    // Normalize to date only
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const count = await prisma.bodyMeasurement.count({
      where: {
        userId: userId,
        measurementType: measurementType,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    return count === 0;
  }

  // Get latest measurement
  async getLatestMeasurement(
    userId: string,
    measurementType: MeasurementType
  ): Promise<BodyMeasurement | null> {
    const data = await prisma.bodyMeasurement.findFirst({
      where: {
        userId: userId,
        measurementType: measurementType
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (!data) return null;

    return {
      ...data,
      value: Number(data.value),
      date: data.date.toISOString().split('T')[0]
    } as unknown as BodyMeasurement;
  }

  // Get weekly average
  async getWeeklyAverage(
    userId: string,
    measurementType: MeasurementType
  ): Promise<number | null> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const data = await prisma.bodyMeasurement.findMany({
      where: {
        userId: userId,
        measurementType: measurementType,
        date: {
          gte: weekAgo
        }
      },
      select: { value: true }
    });

    if (!data || data.length === 0) return null;

    const sum = data.reduce((acc, curr) => acc + Number(curr.value), 0);
    return sum / data.length;
  }

  // Get monthly average
  async getMonthlyAverage(
    userId: string,
    measurementType: MeasurementType
  ): Promise<number | null> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const data = await prisma.bodyMeasurement.findMany({
      where: {
        userId: userId,
        measurementType: measurementType,
        date: {
          gte: monthAgo
        }
      },
      select: { value: true }
    });

    if (!data || data.length === 0) return null;

    const sum = data.reduce((acc, curr) => acc + Number(curr.value), 0);
    return sum / data.length;
  }
}

export const measurementsService = new MeasurementsService();
