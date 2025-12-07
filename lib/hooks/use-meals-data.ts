import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayMeals, toggleMeal, getMealsHistory } from '@/app/actions/meals';

interface TodayMeals {
  id?: string;
  date: string;
  breakfast_completed: boolean;
  breakfast_time?: string | null;
  snack1_completed: boolean;
  snack1_time?: string | null;
  lunch_completed: boolean;
  lunch_time?: string | null;
  snack2_completed: boolean;
  snack2_time?: string | null;
  dinner_completed: boolean;
  dinner_time?: string | null;
  notes?: string | null;
}

export function useMealsData(userId: string) {
  const queryClient = useQueryClient();

  // Fetch today's meals with background sync
  const { data: meals, isLoading } = useQuery({
    queryKey: ['meals', 'today', userId],
    queryFn: async () => {
      const result = await getTodayMeals(userId);
      return result.success ? result.meals : null;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch meals history
  const { data: history = [] } = useQuery({
    queryKey: ['meals', 'history', userId],
    queryFn: async () => {
      const result = await getMealsHistory(userId, 7);
      return result.success ? result.history : [];
    },
    enabled: !!userId,
  });

  // Toggle meal mutation with optimistic updates
  const toggleMutation = useMutation({
    mutationFn: ({ 
      mealType, 
      completed 
    }: { 
      mealType: 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
      completed: boolean;
    }) => toggleMeal(userId, mealType, completed),
    onMutate: async ({ mealType, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['meals', 'today', userId] });

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData(['meals', 'today', userId]);

      // Optimistically update
      queryClient.setQueryData(['meals', 'today', userId], (old: TodayMeals | null) => {
        if (!old) return old;
        
        const timeField = `${mealType}_time` as keyof TodayMeals;
        const completedField = `${mealType}_completed` as keyof TodayMeals;
        
        return {
          ...old,
          [completedField]: completed,
          [timeField]: completed ? new Date().toISOString() : null,
        };
      });

      return { previousMeals };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(['meals', 'today', userId], context.previousMeals);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['meals', 'today', userId] });
      queryClient.invalidateQueries({ queryKey: ['meals', 'history', userId] });
    },
  });

  return {
    meals,
    history,
    isLoading,
    toggleMeal: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
