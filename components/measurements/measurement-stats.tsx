'use client';

import { Card } from '@heroui/react';

interface MeasurementStatsProps {
  weeklyAverage: number | null;
  monthlyAverage: number | null;
  totalLogs: number;
  unit: string;
}

export function MeasurementStats({ weeklyAverage, monthlyAverage, totalLogs, unit }: MeasurementStatsProps) {
  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Statistics</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Weekly Average</span>
          <span className="font-semibold">
            {weeklyAverage ? `${weeklyAverage.toFixed(1)} ${unit}` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Monthly Average</span>
          <span className="font-semibold">
            {monthlyAverage ? `${monthlyAverage.toFixed(1)} ${unit}` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-400">Total Logs</span>
          <span className="font-semibold">{totalLogs}</span>
        </div>
      </div>
    </Card>
  );
}
