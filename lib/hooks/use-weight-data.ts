import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightService } from '@/lib/services/weight-service';
import type { WeightLog } from '@/lib/types';

export function useWeightData(userId: string) {
  const queryClient = useQueryClient();

  // Fetch weight logs with background sync
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['weight', 'logs', userId],
    queryFn: () => weightService.getLogs(userId, 30),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch latest log
  const { data: latestLog } = useQuery({
    queryKey: ['weight', 'latest', userId],
    queryFn: () => weightService.getLatestLog(userId),
    enabled: !!userId,
  });

  // Fetch weekly average
  const { data: weeklyAverage } = useQuery({
    queryKey: ['weight', 'weekly-average', userId],
    queryFn: () => weightService.getWeeklyAverage(userId),
    enabled: !!userId,
  });

  // Fetch monthly average
  const { data: monthlyAverage } = useQuery({
    queryKey: ['weight', 'monthly-average', userId],
    queryFn: () => weightService.getMonthlyAverage(userId),
    enabled: !!userId,
  });

  // Check if can log today
  const { data: canLogToday = true } = useQuery({
    queryKey: ['weight', 'can-log-today', userId],
    queryFn: () => weightService.canLogToday(userId),
    enabled: !!userId,
  });

  // Create log mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: ({ 
      weight, 
      unit, 
      notes 
    }: { 
      weight: number; 
      unit: 'kg' | 'lbs'; 
      notes?: string;
    }) => weightService.createLog(userId, weight, unit, notes),
    onMutate: async (newLog) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['weight', 'logs', userId] });
      await queryClient.cancelQueries({ queryKey: ['weight', 'can-log-today', userId] });

      // Snapshot previous values
      const previousLogs = queryClient.getQueryData(['weight', 'logs', userId]);
      const previousCanLog = queryClient.getQueryData(['weight', 'can-log-today', userId]);

      // Optimistically update logs
      const optimisticLog: WeightLog = {
        id: `temp-${Date.now()}`,
        userId,
        weight: newLog.weight,
        unit: newLog.unit,
        date: new Date(),
        notes: newLog.notes,
        createdAt: new Date(),
      };

      queryClient.setQueryData(['weight', 'logs', userId], (old: WeightLog[] = []) => [
        optimisticLog,
        ...old,
      ]);

      // Update can log today
      queryClient.setQueryData(['weight', 'can-log-today', userId], false);

      return { previousLogs, previousCanLog };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLogs) {
        queryClient.setQueryData(['weight', 'logs', userId], context.previousLogs);
      }
      if (context?.previousCanLog !== undefined) {
        queryClient.setQueryData(['weight', 'can-log-today', userId], context.previousCanLog);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['weight', 'logs', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'latest', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'weekly-average', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'monthly-average', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'can-log-today', userId] });
    },
  });

  // Delete log mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (logId: string) => weightService.deleteLog(logId, userId),
    onMutate: async (logId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['weight', 'logs', userId] });

      // Snapshot previous value
      const previousLogs = queryClient.getQueryData(['weight', 'logs', userId]);

      // Optimistically remove the log
      queryClient.setQueryData(['weight', 'logs', userId], (old: WeightLog[] = []) =>
        old.filter((log) => log.id !== logId)
      );

      return { previousLogs };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousLogs) {
        queryClient.setQueryData(['weight', 'logs', userId], context.previousLogs);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['weight', 'logs', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'latest', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'weekly-average', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'monthly-average', userId] });
      queryClient.invalidateQueries({ queryKey: ['weight', 'can-log-today', userId] });
    },
  });

  return {
    logs,
    latestLog,
    weeklyAverage,
    monthlyAverage,
    canLogToday,
    isLoading,
    createLog: createMutation.mutateAsync,
    deleteLog: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
