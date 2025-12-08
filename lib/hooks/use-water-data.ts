import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { 
  getTodayWaterCount, 
  getTodayWaterTotal, 
  getAllWaterEntries,
  addWaterEntry,
  deleteWaterEntry,
  getWaterTarget,
  WaterIntakeEntry,
} from '@/app/actions/water';

interface LocalWaterEntry {
  id: string;
  userId: string;
  timestamp: string;
  glassCount: number;
  createdAt: string;
}

interface LocalWaterState {
  todayCount: number;
  todayTotal: number;
  entries: LocalWaterEntry[];
}

export function useWaterData(userId: string) {
  const queryClient = useQueryClient();
  
  // Local state for immediate updates
  const [localState, setLocalState] = useState<LocalWaterState>({
    todayCount: 0,
    todayTotal: 0,
    entries: [],
  });

  // Fetch all water entries (background sync)
  const { data: serverEntries = [], isLoading } = useQuery<LocalWaterEntry[]>({
    queryKey: ['water', 'entries', userId],
    queryFn: async () => {
      const result = await getAllWaterEntries(userId);
      if (!result.success || !result.entries) return [];
      
      // Convert to local format
      return result.entries.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        timestamp: entry.timestamp,
        glassCount: entry.glassCount,
        createdAt: entry.createdAt,
      }));
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch water target
  const { data: targetGlasses = 14 } = useQuery({
    queryKey: ['water', 'target', userId],
    queryFn: async () => {
      const result = await getWaterTarget(userId);
      return result.success ? result.target : 14;
    },
    enabled: !!userId,
  });

  // Calculate today's data from server entries
  useEffect(() => {
    if (serverEntries.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = serverEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
        return entryDate === today;
      });
      
      const count = todayEntries.reduce((sum, entry) => sum + entry.glassCount, 0);
      const total = count * 250; // Each glass is 250ml
      
      setLocalState({
        todayCount: count,
        todayTotal: total,
        entries: serverEntries,
      });
    }
  }, [serverEntries]);

  // Calculate time until next allowed water entry (30 minutes cooldown)
  const getTimeUntilNextGlass = useCallback((): { canAdd: boolean; remainingMinutes: number; remainingSeconds: number } => {
    if (localState.entries.length === 0) {
      return { canAdd: true, remainingMinutes: 0, remainingSeconds: 0 };
    }

    // Get the most recent entry
    const sortedEntries = [...localState.entries].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const lastEntry = sortedEntries[0];
    
    const lastEntryTime = new Date(lastEntry.timestamp).getTime();
    const now = Date.now();
    const thirtyMinutesInMs = 30 * 60 * 1000;
    const timeSinceLastEntry = now - lastEntryTime;
    
    if (timeSinceLastEntry >= thirtyMinutesInMs) {
      return { canAdd: true, remainingMinutes: 0, remainingSeconds: 0 };
    }
    
    const remainingMs = thirtyMinutesInMs - timeSinceLastEntry;
    const remainingMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    
    return { canAdd: false, remainingMinutes, remainingSeconds };
  }, [localState.entries]);

  // Add water entry mutation with local-first approach
  const addMutation = useMutation({
    mutationFn: () => addWaterEntry(userId, 1),
    onMutate: async () => {
      // Check cooldown before adding
      const { canAdd } = getTimeUntilNextGlass();
      if (!canAdd) {
        throw new Error('COOLDOWN_ACTIVE');
      }

      // Immediately update local state
      setLocalState(prev => ({
        ...prev,
        todayCount: prev.todayCount + 1,
        todayTotal: prev.todayTotal + 250,
      }));
    },
    onSuccess: () => {
      // Background sync - refetch from server
      queryClient.invalidateQueries({ queryKey: ['water', 'entries', userId] });
    },
    onError: (error) => {
      // Rollback local state on error (except for cooldown errors)
      if (error instanceof Error && error.message !== 'COOLDOWN_ACTIVE') {
        setLocalState(prev => ({
          ...prev,
          todayCount: Math.max(0, prev.todayCount - 1),
          todayTotal: Math.max(0, prev.todayTotal - 250),
        }));
      }
      throw error;
    },
  });

  // Delete water entry mutation
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteWaterEntry(entryId),
    onMutate: async (entryId: string) => {
      // Find the entry to delete
      const entryToDelete = localState.entries.find(e => e.id === entryId);
      if (entryToDelete) {
        const today = new Date().toISOString().split('T')[0];
        const entryDate = new Date(entryToDelete.timestamp).toISOString().split('T')[0];
        
        if (entryDate === today) {
          // Update local state immediately
          setLocalState(prev => ({
            ...prev,
            todayCount: Math.max(0, prev.todayCount - entryToDelete.glassCount),
            todayTotal: Math.max(0, prev.todayTotal - (entryToDelete.glassCount * 250)),
            entries: prev.entries.filter(e => e.id !== entryId),
          }));
        }
      }
    },
    onSuccess: () => {
      // Background sync
      queryClient.invalidateQueries({ queryKey: ['water', 'entries', userId] });
    },
    onError: () => {
      // Refetch on error to restore correct state
      queryClient.invalidateQueries({ queryKey: ['water', 'entries', userId] });
    },
  });

  const addWater = useCallback(async () => {
    return addMutation.mutateAsync();
  }, [addMutation]);

  return {
    todayCount: localState.todayCount,
    todayTotal: localState.todayTotal,
    entries: localState.entries,
    targetGlasses,
    isLoading,
    addWater,
    deleteWater: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getTimeUntilNextGlass,
  };
}
