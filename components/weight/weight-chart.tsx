'use client';

import { WeightLog } from '@/lib/types';
import { Card, Text } from '@heroui/react';
import { toKg, convertWeight } from '@/lib/utils/unit-conversion';

interface WeightChartProps {
  logs: WeightLog[];
  unit: 'kg' | 'lbs';
}

export function WeightChart({ logs, unit }: WeightChartProps) {
  if (logs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Text className="text-gray-400">No weight data yet. Start logging to see your progress!</Text>
      </Card>
    );
  }

  // Reverse to show oldest to newest
  const sortedLogs = [...logs].reverse();
  
  // IMPORTANT: Normalize all weights to kg for calculations
  // This ensures accurate chart scaling even with mixed units
  const weightsKg = sortedLogs.map(log => toKg(log.weight, log.unit));
  const minWeight = Math.min(...weightsKg);
  const maxWeight = Math.max(...weightsKg);
  const range = maxWeight - minWeight || 1;
  const padding = range * 0.1;

  // Calculate points for the line chart
  const chartHeight = 200;
  const chartWidth = 100; // percentage
  const points = sortedLogs.map((log, index) => {
    const x = (index / (sortedLogs.length - 1 || 1)) * chartWidth;
    // Use normalized kg weight for chart positioning
    const weightKg = toKg(log.weight, log.unit);
    const normalizedWeight = (weightKg - minWeight + padding) / (range + padding * 2);
    const y = chartHeight - (normalizedWeight * chartHeight);
    return { x, y, log };
  });

  // Create SVG path
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Create area fill path
  const areaPathData = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Weight Progress</h3>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {convertWeight(logs[0].weight, logs[0].unit, unit).toFixed(1)} {unit}
          </div>
          <Text className="text-xs text-gray-400">Latest</Text>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line
            x1="0"
            y1={chartHeight / 4}
            x2={chartWidth}
            y2={chartHeight / 4}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-gray-700"
          />
          <line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-gray-700"
          />
          <line
            x1="0"
            y1={(chartHeight * 3) / 4}
            x2={chartWidth}
            y2={(chartHeight * 3) / 4}
            stroke="currentColor"
            strokeWidth="0.2"
            className="text-gray-700"
          />

          {/* Area fill */}
          <path
            d={areaPathData}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue-500"
          />

          {/* Points */}
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill="currentColor"
              className="text-blue-500"
            />
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
        <div>
          <Text className="text-xs text-gray-400">Highest</Text>
          <div className="text-sm font-semibold">
            {convertWeight(maxWeight, 'kg', unit).toFixed(1)} {unit}
          </div>
        </div>
        <div>
          <Text className="text-xs text-gray-400">Lowest</Text>
          <div className="text-sm font-semibold">
            {convertWeight(minWeight, 'kg', unit).toFixed(1)} {unit}
          </div>
        </div>
        <div>
          <Text className="text-xs text-gray-400">Entries</Text>
          <div className="text-sm font-semibold">{logs.length}</div>
        </div>
      </div>
    </Card>
  );
}
