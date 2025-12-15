'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { WaterTracker } from '@/components/water/water-tracker';
import { WaterHistory } from '@/components/water/water-history';
import { Spinner } from '@heroui/react';
import { useWaterData } from '@/lib/hooks/use-water-data';
import { updateWaterTarget } from '@/app/actions/water';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function WaterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    todayCount,
    todayTotal,
    entries,
    targetGlasses,
    isLoading,
    addWater,
    deleteWater,
    isAdding,
  } = useWaterData(user?.id || '');

  const handleAdd = useCallback(async () => {
    if (!user) return;
    
    try {
      await addWater();
      toast.success('Glass added! Keep hydrated! 💧');
    } catch (error) {
      toast.error('Failed to add water entry');
      console.error('Failed to add water:', error);
    }
  }, [user, addWater]);

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
    if (!user) return;
    try {
      const result = await updateWaterTarget(user.id, target);
      if (result.success) {
        // Invalidate target query to refetch
        queryClient.invalidateQueries({ queryKey: ['water', 'target', user.id] });
        toast.success(`Daily goal updated to ${target} glasses (${(target * 0.25).toFixed(1)}L)`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error('Failed to update water target');
      console.error('Failed to update water target:', error);
    }
  }, [user, queryClient]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold mb-3 md:text-2xl md:mb-6">Water Tracking</h1>

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
    </>
  );
}
