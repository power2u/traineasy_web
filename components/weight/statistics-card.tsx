'use client';

import { Card, Text } from '@heroui/react';
import { convertWeight } from '@/lib/utils/unit-conversion';
import { memo, useMemo } from 'react';

interface StatisticsCardProps {
  weeklyAverage: number | null;
  monthlyAverage: number | null;
  totalLogs: number;
  unit: 'kg' | 'lbs';
}

export const StatisticsCard = memo(function StatisticsCard({ weeklyAverage, monthlyAverage, totalLogs, unit }: StatisticsCardProps) {
  const weeklyDisplay = useMemo(() => 
    weeklyAverage ? `${convertWeight(weeklyAverage, 'kg', unit).toFixed(1)} ${unit}` : '--',
    [weeklyAverage, unit]
  );

  const monthlyDisplay = useMemo(() => 
    monthlyAverage ? `${convertWeight(monthlyAverage, 'kg', unit).toFixed(1)} ${unit}` : '--',
    [monthlyAverage, unit]
  );
  return (
    <Card className="p-4 md:p-6">
      <h3 className="mb-4 text-lg font-semibold">Statistics</h3>
      
      <div className="space-y-4">
        <div>
          <Text className="text-xs text-gray-400">Weekly Average</Text>
          <div className="mt-1 text-2xl font-bold">{weeklyDisplay}</div>
          <Text className="text-xs text-gray-400">Last 7 days</Text>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <Text className="text-xs text-gray-400">Monthly Average</Text>
          <div className="mt-1 text-2xl font-bold">{monthlyDisplay}</div>
          <Text className="text-xs text-gray-400">Last 30 days</Text>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <Text className="text-xs text-gray-400">Total Logs</Text>
          <div className="mt-1 text-2xl font-bold">{totalLogs}</div>
          <Text className="text-xs text-gray-400">All time</Text>
        </div>
      </div>
    </Card>
  );
});
