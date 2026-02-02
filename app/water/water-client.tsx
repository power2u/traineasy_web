'use client';

import { WaterTracker } from '@/components/water/water-tracker';
import { WaterHistory } from '@/components/water/water-history';
import { useWaterData } from '@/lib/hooks/use-water-data';
import { updateWaterTarget } from '@/app/actions/water';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface WaterClientProps {
    userId: string;
    initialData: {
        count: number;
        entries: any[];
        target: number;
    };
}

export function WaterClient({ userId, initialData }: WaterClientProps) {
    const queryClient = useQueryClient();
    const {
        todayCount,
        todayTotal,
        entries,
        targetGlasses,
        addWater,
        deleteWater,
        isAdding,
    } = useWaterData(userId, initialData);

    const handleAdd = useCallback(async () => {
        try {
            await addWater();
            toast.success('Glass added! Keep hydrated! 💧');
        } catch (error) {
            toast.error('Failed to add water entry');
            console.error('Failed to add water:', error);
        }
    }, [addWater]);

    const handleDelete = useCallback(async (entryId: string) => {
        try {
            deleteWater(entryId);
            toast.success('Entry removed');
        } catch (error) {
            toast.error('Failed to delete entry');
            console.error('Failed to delete water entry:', error);
        }
    }, [deleteWater]);

    const handleUpdateTarget = useCallback(async (target: number) => {
        try {
            const result = await updateWaterTarget(userId, target);
            if (result.success) {
                // Invalidate target query to refetch
                queryClient.invalidateQueries({ queryKey: ['water', 'target', userId] });
                toast.success(`Daily goal updated to ${target} glasses (${(target * 0.25).toFixed(1)}L)`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast.error('Failed to update water target');
            console.error('Failed to update water target:', error);
        }
    }, [userId, queryClient]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                <div>
                    <WaterTracker
                        count={todayCount}
                        totalMl={todayTotal}
                        targetGlasses={targetGlasses}
                        onAdd={handleAdd}
                        onUpdateTarget={handleUpdateTarget}
                    />
                </div>

                <div>
                    <WaterHistory entries={entries} onDelete={handleDelete} />
                </div>
            </div>
    );
}
