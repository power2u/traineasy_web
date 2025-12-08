'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { useMeasurementsData } from '@/lib/hooks/use-measurements-data';
import { preferencesService } from '@/lib/services/preferences-service';
import type { MeasurementType } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';
import { MeasurementChart } from '@/components/measurements/measurement-chart';
import { MeasurementForm } from '@/components/measurements/measurement-form';
import { MeasurementHistory } from '@/components/measurements/measurement-history';
import { MeasurementStats } from '@/components/measurements/measurement-stats';

const MEASUREMENT_TYPES: MeasurementType[] = [
  'weight',
  'biceps_left',
  'biceps_right',
  'chest',
  'waist',
  'hips',
  'thighs_left',
  'thighs_right',
  'calves_left',
  'calves_right',
  'forearms_left',
  'forearms_right',
  'shoulders',
  'neck',
];

export default function MeasurementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<MeasurementType>('weight');
  const [preferredUnit, setPreferredUnit] = useState<'kg' | 'lbs' | 'cm' | 'in'>('kg');
  const [prefsLoading, setPrefsLoading] = useState(true);

  // Use React Query hook for measurements data
  const {
    measurements,
    loading,
    canLogToday,
    weeklyAverage,
    monthlyAverage,
    saveMeasurement,
    deleteMeasurement,
    isSaving,
  } = useMeasurementsData({
    userId: user?.id || null,
    measurementType: selectedType,
    days: 90, // Load 90 days of data
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load preferences once
  useEffect(() => {
    if (user) {
      preferencesService.getPreferences(user.id).then((prefs) => {
        if (prefs) {
          // Set unit based on measurement type
          if (selectedType === 'weight') {
            setPreferredUnit(prefs.preferred_unit);
          } else {
            setPreferredUnit('cm');
          }
        }
        setPrefsLoading(false);
      });
    }
  }, [user, selectedType]);

  const handleSaveMeasurement = async (value: number, notes?: string) => {
    if (!user) return;

    try {
      await saveMeasurement(value, preferredUnit, notes);
    } catch (error) {
      console.error('Failed to save measurement:', error);
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    if (!user) return;

    try {
      deleteMeasurement(id);
    } catch (error) {
      console.error('Failed to delete measurement:', error);
    }
  };

  if (authLoading || prefsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const currentValue = measurements.length > 0 ? measurements[0].value : null;
  const previousValue = measurements.length > 1 ? measurements[1].value : null;

  return (
    <div className="space-y-3 pb-20 md:space-y-6 md:pb-6">
      {/* Measurement Type Selector - Mobile Optimized */}
      <div className="-mx-4 bg-gray-950 px-4 py-3 md:mx-0 md:rounded-lg md:bg-transparent md:px-0">
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-2 pb-1">
            {MEASUREMENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-gray-800 text-gray-400 active:bg-gray-700'
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
          <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 md:text-xs">Current</div>
            <div className="mt-1.5 text-2xl font-bold md:text-3xl">
              {currentValue.toFixed(1)}
            </div>
            <div className="mt-0.5 text-xs font-medium text-gray-400">{preferredUnit}</div>
          </div>
          
          {previousValue && (
            <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 md:text-xs">Change</div>
              <div className="mt-1.5 text-2xl font-bold md:text-3xl">
                {(() => {
                  const change = currentValue - previousValue;
                  const isPositive = change > 0;
                  return (
                    <span className={isPositive ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}>
                      {isPositive ? '+' : ''}{change.toFixed(1)}
                    </span>
                  );
                })()}
              </div>
              <div className="mt-0.5 text-xs font-medium text-gray-400">{preferredUnit}</div>
            </div>
          )}
        </div>
      )}

      {/* Log Form - Priority on Mobile */}
      <MeasurementForm
        measurementType={selectedType}
        unit={preferredUnit}
        onSubmit={handleSaveMeasurement}
        canLogToday={canLogToday}
      />

      {/* Statistics - Compact */}
      <MeasurementStats
        weeklyAverage={weeklyAverage}
        monthlyAverage={monthlyAverage}
        totalLogs={measurements.length}
        unit={preferredUnit}
      />

      {/* Chart - Full Width on Mobile */}
      {measurements.length > 0 && (
        <MeasurementChart
          measurements={measurements}
          measurementType={selectedType}
          unit={preferredUnit}
        />
      )}

      {/* History */}
      <MeasurementHistory
        measurements={measurements}
        measurementType={selectedType}
        unit={preferredUnit}
        onDelete={handleDeleteMeasurement}
      />
    </div>
  );
}
