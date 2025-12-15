import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { 
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



  // Add water entry mutation with local-first approach
  const addMutation = useMutation({
    mutationFn: () => addWaterEntry(userId, 1),
    onMutate: async () => {
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
      // Rollback local state on error
      setLocalState(prev => ({
        ...prev,
        todayCount: Math.max(0, prev.todayCount - 1),
        todayTotal: Math.max(0, prev.todayTotal - 250),
      }));
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
  };
}
