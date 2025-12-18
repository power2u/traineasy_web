<<<<<<< HEAD
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { measurementsService } from '@/lib/services/measurements-service';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { useMemo } from 'react';

interface UseMeasurementsDataOptions {
  userId: string | null;
  measurementType: MeasurementType;
  days?: number;
}

export function useMeasurementsData({ userId, measurementType, days = 90 }: UseMeasurementsDataOptions) {
  const queryClient = useQueryClient();

  // Fetch measurements with React Query
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['measurements', userId, measurementType, days],
    queryFn: () => measurementsService.getMeasurements(userId!, measurementType, days),
    enabled: !!userId,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime)
  });

  // Check if can log today
  const { data: canLogToday = true } = useQuery({
    queryKey: ['measurements', 'canLog', userId, measurementType],
    queryFn: () => measurementsService.canLogToday(userId!, measurementType),
    enabled: !!userId,
    staleTime: 60000,
  });

  // Get weekly average (computed from measurements data)
  const weeklyAverage = useMemo(() => {
    if (measurements.length === 0) return null;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const weekData = measurements.filter(m => m.date >= weekAgoStr);
    if (weekData.length === 0) return null;
    
    const sum = weekData.reduce((acc, curr) => acc + curr.value, 0);
    return sum / weekData.length;
  }, [measurements]);

  // Get monthly average (computed from measurements data)
  const monthlyAverage = useMemo(() => {
    if (measurements.length === 0) return null;
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    
    const monthData = measurements.filter(m => m.date >= monthAgoStr);
    if (monthData.length === 0) return null;
    
    const sum = monthData.reduce((acc, curr) => acc + curr.value, 0);
    return sum / monthData.length;
  }, [measurements]);

  // Save measurement mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: ({ value, unit, notes }: { value: number; unit: 'kg' | 'lbs' | 'cm' | 'in'; notes?: string }) =>
      measurementsService.saveMeasurement(userId!, measurementType, value, unit, undefined, notes),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['measurements', userId, measurementType] });
      queryClient.invalidateQueries({ queryKey: ['measurements', 'canLog', userId, measurementType] });
    },
  });

  // Delete measurement mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => measurementsService.deleteMeasurement(id, userId!),
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['measurements', userId, measurementType] });

      // Snapshot previous value
      const previousMeasurements = queryClient.getQueryData<BodyMeasurement[]>([
        'measurements',
        userId,
        measurementType,
        days,
      ]);

      // Optimistically update
      queryClient.setQueryData<BodyMeasurement[]>(
        ['measurements', userId, measurementType, days],
        (old) => old?.filter((m) => m.id !== id) || []
      );

      return { previousMeasurements };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousMeasurements) {
        queryClient.setQueryData(
          ['measurements', userId, measurementType, days],
          context.previousMeasurements
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['measurements', userId, measurementType] });
    },
  });

  return {
    measurements,
    loading: isLoading,
    canLogToday,
    weeklyAverage,
    monthlyAverage,
    saveMeasurement: (value: number, unit: 'kg' | 'lbs' | 'cm' | 'in', notes?: string) =>
      saveMutation.mutateAsync({ value, unit, notes }),
    deleteMeasurement: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
=======
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { measurementsService } from '@/lib/services/measurements-service';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { useMemo } from 'react';

interface UseMeasurementsDataOptions {
  userId: string | null;
  measurementType: MeasurementType;
  days?: number;
}

export function useMeasurementsData({ userId, measurementType, days = 90 }: UseMeasurementsDataOptions) {
  const queryClient = useQueryClient();

  // Fetch measurements with React Query
  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ['measurements', userId, measurementType, days],
    queryFn: () => measurementsService.getMeasurements(userId!, measurementType, days),
    enabled: !!userId,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime)
  });

  // Check if can log today
  const { data: canLogToday = true } = useQuery({
    queryKey: ['measurements', 'canLog', userId, measurementType],
    queryFn: () => measurementsService.canLogToday(userId!, measurementType),
    enabled: !!userId,
    staleTime: 60000,
  });

  // Get weekly average (computed from measurements data)
  const weeklyAverage = useMemo(() => {
    if (measurements.length === 0) return null;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const weekData = measurements.filter(m => m.date >= weekAgoStr);
    if (weekData.length === 0) return null;
    
    const sum = weekData.reduce((acc, curr) => acc + curr.value, 0);
    return sum / weekData.length;
  }, [measurements]);

  // Get monthly average (computed from measurements data)
  const monthlyAverage = useMemo(() => {
    if (measurements.length === 0) return null;
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];
    
    const monthData = measurements.filter(m => m.date >= monthAgoStr);
    if (monthData.length === 0) return null;
    
    const sum = monthData.reduce((acc, curr) => acc + curr.value, 0);
    return sum / monthData.length;
  }, [measurements]);

  // Save measurement mutation with optimistic updates
  const saveMutation = useMutation({
    mutationFn: ({ value, unit, notes }: { value: number; unit: 'kg' | 'lbs' | 'cm' | 'in'; notes?: string }) =>
      measurementsService.saveMeasurement(userId!, measurementType, value, unit, undefined, notes),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['measurements', userId, measurementType] });
      queryClient.invalidateQueries({ queryKey: ['measurements', 'canLog', userId, measurementType] });
    },
  });

  // Delete measurement mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => measurementsService.deleteMeasurement(id, userId!),
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['measurements', userId, measurementType] });

      // Snapshot previous value
      const previousMeasurements = queryClient.getQueryData<BodyMeasurement[]>([
        'measurements',
        userId,
        measurementType,
        days,
      ]);

      // Optimistically update
      queryClient.setQueryData<BodyMeasurement[]>(
        ['measurements', userId, measurementType, days],
        (old) => old?.filter((m) => m.id !== id) || []
      );

      return { previousMeasurements };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousMeasurements) {
        queryClient.setQueryData(
          ['measurements', userId, measurementType, days],
          context.previousMeasurements
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['measurements', userId, measurementType] });
    },
  });

  return {
    measurements,
    loading: isLoading,
    canLogToday,
    weeklyAverage,
    monthlyAverage,
    saveMeasurement: (value: number, unit: 'kg' | 'lbs' | 'cm' | 'in', notes?: string) =>
      saveMutation.mutateAsync({ value, unit, notes }),
    deleteMeasurement: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
>>>>>>> main
