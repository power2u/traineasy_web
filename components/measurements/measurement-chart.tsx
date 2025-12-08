'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card } from '@heroui/react';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MeasurementChartProps {
  measurements: BodyMeasurement[];
  measurementType: MeasurementType;
  unit: 'kg' | 'lbs' | 'cm' | 'in';
}

export function MeasurementChart({ measurements, measurementType, unit }: MeasurementChartProps) {
  const chartData = useMemo(() => {
    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedMeasurements.map((m) =>
        new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: `${MEASUREMENT_LABELS[measurementType]} (${unit})`,
          data: sortedMeasurements.map((m) => m.value),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [measurements, measurementType, unit]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context: any) => `${context.parsed.y.toFixed(1)} ${unit}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Progress Chart</h3>
      <div className="h-[250px] md:h-[300px]">
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
}
