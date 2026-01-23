'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Spinner } from '@heroui/react';
import type { MeasurementType, BodyMeasurement } from '@/lib/types';
import { MEASUREMENT_LABELS, MEASUREMENT_TYPES } from '@/lib/types';
import { MeasurementChart } from '@/components/measurements/measurement-chart';
import { MeasurementForm } from '@/components/measurements/measurement-form';
import { MeasurementHistory } from '@/components/measurements/measurement-history';
import { MeasurementStats } from '@/components/measurements/measurement-stats';
import { MeasurementsData, saveMeasurementAction, deleteMeasurementAction } from '@/app/actions/measurements';
import { toast } from 'sonner';

interface MeasurementsClientProps {
    userId: string;
    initialType: MeasurementType;
    data: MeasurementsData;
}

export function MeasurementsClient({ userId, initialType, data }: MeasurementsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { measurements, preferences, stats, canLogToday } = data;
    const preferredUnit = preferences.preferred_unit;

    const handleTypeChange = (type: MeasurementType) => {
        router.push(`/measurements?type=${type}`);
    };

    const handleSaveMeasurement = async (value: number, notes?: string) => {
        try {
            const result = await saveMeasurementAction(userId, initialType, value, preferredUnit, notes);
            if (result.success) {
                toast.success('Measurement saved successfully');
            }
        } catch (error) {
            console.error('Failed to save measurement:', error);
            toast.error('Failed to save measurement');
        }
    };

    const handleDeleteMeasurement = async (id: string) => {
        try {
            const result = await deleteMeasurementAction(id, userId);
            if (result.success) {
                toast.success('Measurement deleted');
            }
        } catch (error) {
            console.error('Failed to delete measurement:', error);
            toast.error('Failed to delete measurement');
        }
    };

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner size="lg" color="current" />
            </div>
        );
    }

    const currentValue = measurements.length > 0 ? measurements[0].value : null;
    const previousValue = measurements.length > 1 ? measurements[1].value : null;

    return (
        <div className="space-y-3 pb-20 md:space-y-6 md:pb-6">
            {/* Measurement Type Selector - Mobile Optimized */}
            <div className="-mx-4 bg-card px-4 py-3 md:mx-0 md:rounded-lg md:bg-transparent md:px-0">
                <div className="overflow-x-auto -mx-1 px-1">
                    <div className="flex gap-2 pb-1">
                        {MEASUREMENT_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => handleTypeChange(type)}
                                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${initialType === type
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                    : 'bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent'
                                    }`}
                            >
                                {MEASUREMENT_LABELS[type]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Current Stats - Compact for Mobile */}
            {currentValue && (
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="rounded-xl bg-linear-to-br from-card to-secondary p-4 border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground md:text-xs">Current</div>
                        <div className="mt-1.5 text-2xl font-bold text-foreground md:text-3xl">
                            {currentValue.toFixed(1)}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-muted-foreground">{preferredUnit}</div>
                    </div>

                    {previousValue && (
                        <div className="rounded-xl bg-linear-to-br from-card to-secondary p-4 border border-border">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground md:text-xs">Change</div>
                            <div className="mt-1.5 text-2xl font-bold md:text-3xl">
                                {(() => {
                                    const change = currentValue - previousValue;
                                    const isPositive = change > 0;
                                    return (
                                        <span className={isPositive ? 'text-success' : change < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                                            {isPositive ? '+' : ''}{change.toFixed(1)}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{preferredUnit}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Log Form - Priority on Mobile */}
            <MeasurementForm
                measurementType={initialType}
                unit={preferredUnit}
                onSubmit={handleSaveMeasurement}
                canLogToday={canLogToday}
            />

            {/* Statistics - Compact */}
            <MeasurementStats
                weeklyAverage={stats.weeklyAverage}
                monthlyAverage={stats.monthlyAverage}
                totalLogs={measurements.length}
                unit={preferredUnit}
            />

            {/* Chart - Full Width on Mobile */}
            {measurements.length > 0 && (
                <MeasurementChart
                    measurements={measurements}
                    measurementType={initialType}
                    unit={preferredUnit}
                />
            )}

            {/* History */}
            <MeasurementHistory
                measurements={measurements}
                measurementType={initialType}
                unit={preferredUnit}
                onDelete={handleDeleteMeasurement}
            />
        </div>
    );
}
