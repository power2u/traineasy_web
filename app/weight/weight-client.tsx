'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Text } from '@heroui/react';
import { WeightChart } from '@/components/weight/weight-chart';
import { WeightLogForm } from '@/components/weight/weight-log-form';
import { WeightHistory } from '@/components/weight/weight-history';
import { GoalWeightCard } from '@/components/weight/goal-weight-card';
import { BMICard } from '@/components/weight/bmi-card';
import { StatisticsCard } from '@/components/weight/statistics-card';
import type { WeightLog } from '@/lib/types';
import { convertWeight } from '@/lib/utils/unit-conversion';
import { createWeightLog, deleteWeightLog } from '@/app/actions/weight';
import { toast } from 'sonner';

interface WeightClientProps {
    userId: string;
    initialLogs: WeightLog[];
    canLogToday: boolean;
    weeklyAverage: number | null;
    monthlyAverage: number | null;
    preferences: any;
}

export function WeightClient({
    userId,
    initialLogs,
    canLogToday: initialCanLogToday,
    weeklyAverage,
    monthlyAverage,
    preferences
}: WeightClientProps) {
    const router = useRouter();
    const [logs, setLogs] = useState<WeightLog[]>(initialLogs);
    const [canLogToday, setCanLogToday] = useState(initialCanLogToday);
    const [preferredUnit, setPreferredUnit] = useState<'kg' | 'lbs'>(preferences?.preferred_unit || 'kg');

    // Helpers derived from stats/prefs
    const currentWeight = logs.length > 0 ? logs[0].weight : null;
    const startingWeight = logs.length > 0 ? logs[logs.length - 1].weight : null;
    const heightCm = preferences?.height_cm || null;

    // Calculate goal weight in preferred unit
    let goalWeight = null;
    if (preferences?.goal_weight) {
        goalWeight = convertWeight(
            preferences.goal_weight,
            preferences.goal_weight_unit,
            preferredUnit
        );
    }

    const handleLogWeight = async (weight: number, notes?: string) => {
        try {
            const result = await createWeightLog(userId, weight, preferredUnit, notes);
            if (result.success && result.log) {
                // Optimistic / Client update
                setLogs(prev => [result.log as any, ...prev]);
                setCanLogToday(false);
                toast.success("Weight logged successfully! 💪");
                router.refresh(); // Refresh server data mainly for side-effects (dashboard, etc)
            } else {
                toast.error(result.error || "Failed to log weight");
            }
        } catch (error) {
            console.error('Failed to log weight:', error);
            toast.error('An unexpected error occurred');
        }
    };

    const handleDeleteLog = async (logId: string) => {
        try {
            const result = await deleteWeightLog(logId);
            if (result.success) {
                setLogs(prev => prev.filter(l => l.id !== logId));
                // Check if we deleted today's log to reset canLogToday
                const deletedLog = logs.find(l => l.id === logId);
                const today = new Date().toISOString().split('T')[0];
                if (deletedLog && new Date(deletedLog.date).toISOString().split('T')[0] === today) {
                    setCanLogToday(true);
                }
                toast.success("Weight log deleted");
                router.refresh();
            } else {
                toast.error(result.error || "Failed to delete log");
            }
        } catch (error) {
            console.error('Failed to delete weight log:', error);
            toast.error('An unexpected error occurred');
        }
    };

    // Callback to refresh data if child components update preferences (e.g. unit)
    // For now, simpler implementation: just refresh the page or update local state
    // ideally we handle unit change locally
    const handlePreferencesUpdate = () => {
        router.refresh();
        // In a full implementation we might refetch profile here
    };

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
                        userId={userId}
                        currentWeight={currentWeight}
                        startingWeight={startingWeight}
                        goalWeight={goalWeight}
                        unit={preferredUnit}
                        onUpdate={handlePreferencesUpdate}
                    />

                    {/* BMI Calculator */}
                    <BMICard
                        userId={userId}
                        currentWeight={currentWeight}
                        heightCm={heightCm}
                        unit={preferredUnit}
                        onUpdate={handlePreferencesUpdate}
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
