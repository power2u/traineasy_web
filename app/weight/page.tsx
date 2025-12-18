<<<<<<< HEAD
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Spinner, Text } from '@heroui/react';
import { weightService } from '@/lib/services/weight-service';
import { preferencesService } from '@/lib/services/preferences-service';
import { WeightChart } from '@/components/weight/weight-chart';
import { WeightLogForm } from '@/components/weight/weight-log-form';
import { WeightHistory } from '@/components/weight/weight-history';
import { GoalWeightCard } from '@/components/weight/goal-weight-card';
import { BMICard } from '@/components/weight/bmi-card';
import { StatisticsCard } from '@/components/weight/statistics-card';
import type { WeightLog } from '@/lib/types';
import { convertWeight } from '@/lib/utils/unit-conversion';

export default function WeightPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [canLogToday, setCanLogToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [preferredUnit, setPreferredUnit] = useState<'kg' | 'lbs'>('kg');
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load everything in parallel
      const [logsData, canLog, weekly, monthly, prefs] = await Promise.all([
        weightService.getLogs(user.id, 30),
        weightService.canLogToday(user.id),
        weightService.getWeeklyAverage(user.id),
        weightService.getMonthlyAverage(user.id),
        preferencesService.getPreferences(user.id),
      ]);
      
      setLogs(logsData);
      setCanLogToday(canLog);
      setWeeklyAverage(weekly);
      setMonthlyAverage(monthly);
      
      // Set preferences
      if (prefs) {
        setPreferredUnit(prefs.preferred_unit);
        setHeightCm(prefs.height_cm || null);
        
        // Convert goal weight to user's preferred unit if needed
        if (prefs.goal_weight) {
          const goalInPreferredUnit = convertWeight(
            prefs.goal_weight,
            prefs.goal_weight_unit,
            prefs.preferred_unit
          );
          setGoalWeight(goalInPreferredUnit);
        }
      }
    } catch (err) {
      console.error('Failed to load weight data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPreferredUnit = async () => {
    if (!user) return;
    
    try {
      const prefs = await preferencesService.getPreferences(user.id);
      
      if (prefs) {
        setPreferredUnit(prefs.preferred_unit);
        setHeightCm(prefs.height_cm || null);
        
        // Convert goal weight to user's preferred unit if needed
        if (prefs.goal_weight) {
          const goalInPreferredUnit = convertWeight(
            prefs.goal_weight,
            prefs.goal_weight_unit,
            prefs.preferred_unit
          );
          setGoalWeight(goalInPreferredUnit);
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleLogWeight = async (weight: number, notes?: string) => {
    if (!user) return;

    try {
      await weightService.createLog(user.id, weight, preferredUnit, notes);
      await loadData();
      // Toast will be shown by the component
    } catch (error) {
      console.error('Failed to log weight:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!user) return;

    try {
      await weightService.deleteLog(logId, user.id);
      await loadData();
      // Toast will be shown by the component
    } catch (error) {
      console.error('Failed to delete weight log:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const currentWeight = logs.length > 0 ? logs[0].weight : null;
  const startingWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Stats */}
      {logs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 md:p-4">
            <Text className="text-[10px] text-gray-400 md:text-xs">Current Weight</Text>
            <div className="mt-0.5 text-xl font-bold md:mt-1 md:text-2xl">
              {convertWeight(logs[0].weight, logs[0].unit, preferredUnit).toFixed(1)} {preferredUnit}
            </div>
            <Text className="text-xs text-gray-400">
              {new Date(logs[0].date).toLocaleDateString()}
            </Text>
          </div>
          
          {logs.length > 1 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 md:p-4">
              <Text className="text-[10px] text-gray-400 md:text-xs">Change</Text>
              <div className="mt-0.5 text-xl font-bold md:mt-1 md:text-2xl">
                {(() => {
                  const currentWeight = convertWeight(logs[0].weight, logs[0].unit, preferredUnit);
                  const previousWeight = convertWeight(logs[1].weight, logs[1].unit, preferredUnit);
                  const change = currentWeight - previousWeight;
                  const isPositive = change > 0;
                  return (
                    <span className={isPositive ? 'text-red-400' : change < 0 ? 'text-green-400' : ''}>
                      {isPositive ? '+' : ''}{change.toFixed(1)} {preferredUnit}
                    </span>
                  );
                })()}
              </div>
              <Text className="text-xs text-gray-400">Since last log</Text>
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout for Desktop */}
      <div className="grid gap-3 md:grid-cols-2 md:gap-6">
        {/* Left Column */}
        <div className="space-y-3 md:space-y-6">
          {/* Log Form */}
          <WeightLogForm
            unit={preferredUnit}
            onSubmit={handleLogWeight}
            canLogToday={canLogToday}
          />

          {/* Goal Weight */}
          <GoalWeightCard
            userId={user!.id}
            currentWeight={currentWeight}
            startingWeight={startingWeight}
            goalWeight={goalWeight}
            unit={preferredUnit}
            onUpdate={loadPreferredUnit}
          />

          {/* BMI Calculator */}
          <BMICard
            userId={user!.id}
            currentWeight={currentWeight}
            heightCm={heightCm}
            unit={preferredUnit}
            onUpdate={loadPreferredUnit}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4 md:space-y-6">
          {/* Statistics */}
          <StatisticsCard
            weeklyAverage={weeklyAverage}
            monthlyAverage={monthlyAverage}
            totalLogs={logs.length}
            unit={preferredUnit}
          />

          {/* Chart */}
          {logs.length > 0 && (
            <WeightChart logs={logs} unit={preferredUnit} />
          )}
        </div>
      </div>

      {/* History - Full Width */}
      <WeightHistory
        logs={logs}
        unit={preferredUnit}
        onDelete={handleDeleteLog}
      />
    </div>
  );
}
=======
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Spinner, Text } from '@heroui/react';
import { weightService } from '@/lib/services/weight-service';
import { preferencesService } from '@/lib/services/preferences-service';
import { WeightChart } from '@/components/weight/weight-chart';
import { WeightLogForm } from '@/components/weight/weight-log-form';
import { WeightHistory } from '@/components/weight/weight-history';
import { GoalWeightCard } from '@/components/weight/goal-weight-card';
import { BMICard } from '@/components/weight/bmi-card';
import { StatisticsCard } from '@/components/weight/statistics-card';
import type { WeightLog } from '@/lib/types';
import { convertWeight } from '@/lib/utils/unit-conversion';

export default function WeightPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [canLogToday, setCanLogToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [preferredUnit, setPreferredUnit] = useState<'kg' | 'lbs'>('kg');
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weeklyAverage, setWeeklyAverage] = useState<number | null>(null);
  const [monthlyAverage, setMonthlyAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load everything in parallel
      const [logsData, canLog, weekly, monthly, prefs] = await Promise.all([
        weightService.getLogs(user.id, 30),
        weightService.canLogToday(user.id),
        weightService.getWeeklyAverage(user.id),
        weightService.getMonthlyAverage(user.id),
        preferencesService.getPreferences(user.id),
      ]);
      
      setLogs(logsData);
      setCanLogToday(canLog);
      setWeeklyAverage(weekly);
      setMonthlyAverage(monthly);
      
      // Set preferences
      if (prefs) {
        setPreferredUnit(prefs.preferred_unit);
        setHeightCm(prefs.height_cm || null);
        
        // Convert goal weight to user's preferred unit if needed
        if (prefs.goal_weight) {
          const goalInPreferredUnit = convertWeight(
            prefs.goal_weight,
            prefs.goal_weight_unit,
            prefs.preferred_unit
          );
          setGoalWeight(goalInPreferredUnit);
        }
      }
    } catch (err) {
      console.error('Failed to load weight data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPreferredUnit = async () => {
    if (!user) return;
    
    try {
      const prefs = await preferencesService.getPreferences(user.id);
      
      if (prefs) {
        setPreferredUnit(prefs.preferred_unit);
        setHeightCm(prefs.height_cm || null);
        
        // Convert goal weight to user's preferred unit if needed
        if (prefs.goal_weight) {
          const goalInPreferredUnit = convertWeight(
            prefs.goal_weight,
            prefs.goal_weight_unit,
            prefs.preferred_unit
          );
          setGoalWeight(goalInPreferredUnit);
        }
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleLogWeight = async (weight: number, notes?: string) => {
    if (!user) return;

    try {
      await weightService.createLog(user.id, weight, preferredUnit, notes);
      await loadData();
      // Toast will be shown by the component
    } catch (error) {
      console.error('Failed to log weight:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!user) return;

    try {
      await weightService.deleteLog(logId, user.id);
      await loadData();
      // Toast will be shown by the component
    } catch (error) {
      console.error('Failed to delete weight log:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const currentWeight = logs.length > 0 ? logs[0].weight : null;
  const startingWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Stats */}
      {logs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 md:p-4">
            <Text className="text-[10px] text-gray-400 md:text-xs">Current Weight</Text>
            <div className="mt-0.5 text-xl font-bold md:mt-1 md:text-2xl">
              {convertWeight(logs[0].weight, logs[0].unit, preferredUnit).toFixed(1)} {preferredUnit}
            </div>
            <Text className="text-xs text-gray-400">
              {new Date(logs[0].date).toLocaleDateString()}
            </Text>
          </div>
          
          {logs.length > 1 && (
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 md:p-4">
              <Text className="text-[10px] text-gray-400 md:text-xs">Change</Text>
              <div className="mt-0.5 text-xl font-bold md:mt-1 md:text-2xl">
                {(() => {
                  const currentWeight = convertWeight(logs[0].weight, logs[0].unit, preferredUnit);
                  const previousWeight = convertWeight(logs[1].weight, logs[1].unit, preferredUnit);
                  const change = currentWeight - previousWeight;
                  const isPositive = change > 0;
                  return (
                    <span className={isPositive ? 'text-red-400' : change < 0 ? 'text-green-400' : ''}>
                      {isPositive ? '+' : ''}{change.toFixed(1)} {preferredUnit}
                    </span>
                  );
                })()}
              </div>
              <Text className="text-xs text-gray-400">Since last log</Text>
            </div>
          )}
        </div>
      )}

      {/* Two Column Layout for Desktop */}
      <div className="grid gap-3 md:grid-cols-2 md:gap-6">
        {/* Left Column */}
        <div className="space-y-3 md:space-y-6">
          {/* Log Form */}
          <WeightLogForm
            unit={preferredUnit}
            onSubmit={handleLogWeight}
            canLogToday={canLogToday}
          />

          {/* Goal Weight */}
          <GoalWeightCard
            userId={user!.id}
            currentWeight={currentWeight}
            startingWeight={startingWeight}
            goalWeight={goalWeight}
            unit={preferredUnit}
            onUpdate={loadPreferredUnit}
          />

          {/* BMI Calculator */}
          <BMICard
            userId={user!.id}
            currentWeight={currentWeight}
            heightCm={heightCm}
            unit={preferredUnit}
            onUpdate={loadPreferredUnit}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-4 md:space-y-6">
          {/* Statistics */}
          <StatisticsCard
            weeklyAverage={weeklyAverage}
            monthlyAverage={monthlyAverage}
            totalLogs={logs.length}
            unit={preferredUnit}
          />

          {/* Chart */}
          {logs.length > 0 && (
            <WeightChart logs={logs} unit={preferredUnit} />
          )}
        </div>
      </div>

      {/* History - Full Width */}
      <WeightHistory
        logs={logs}
        unit={preferredUnit}
        onDelete={handleDeleteLog}
      />
    </div>
  );
}
>>>>>>> main
