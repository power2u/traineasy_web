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
      <h3 className="mb-4 text-lg font-semibold text-foreground">Statistics</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Weekly Average</span>
          <span className="font-semibold text-foreground">
            {weeklyAverage ? `${weeklyAverage.toFixed(1)} ${unit}` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Monthly Average</span>
          <span className="font-semibold text-foreground">
            {monthlyAverage ? `${monthlyAverage.toFixed(1)} ${unit}` : 'N/A'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Total Logs</span>
          <span className="font-semibold text-foreground">{totalLogs}</span>
        </div>
      </div>
    </Card>
  );
}
