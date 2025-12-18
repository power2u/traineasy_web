<<<<<<< HEAD
'use client';

import { Button, Card } from '@heroui/react';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

interface MeasurementHistoryProps {
  measurements: BodyMeasurement[];
  measurementType: MeasurementType;
  unit: string;
  onDelete: (id: string) => Promise<void>;
}

export function MeasurementHistory({ measurements, measurementType, unit, onDelete }: MeasurementHistoryProps) {
  if (measurements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-400">No {MEASUREMENT_LABELS[measurementType].toLowerCase()} logs yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">History</h3>
      
      <div className="space-y-2">
        {measurements.map((measurement) => (
          <div
            key={measurement.id}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 p-3"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">
                  {measurement.value.toFixed(1)} {unit}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(measurement.date).toLocaleDateString()}
                </span>
              </div>
              {measurement.notes && (
                <p className="mt-1 text-sm text-gray-400">{measurement.notes}</p>
              )}
            </div>
            
            <Button
              size="sm"
              variant="danger-soft"
              onPress={() => onDelete(measurement.id)}
            >
              🗑️
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
=======
'use client';

import { Button, Card } from '@heroui/react';
import type { BodyMeasurement, MeasurementType } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

interface MeasurementHistoryProps {
  measurements: BodyMeasurement[];
  measurementType: MeasurementType;
  unit: string;
  onDelete: (id: string) => Promise<void>;
}

export function MeasurementHistory({ measurements, measurementType, unit, onDelete }: MeasurementHistoryProps) {
  if (measurements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-400">No {MEASUREMENT_LABELS[measurementType].toLowerCase()} logs yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">History</h3>
      
      <div className="space-y-2">
        {measurements.map((measurement) => (
          <div
            key={measurement.id}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950 p-3"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">
                  {measurement.value.toFixed(1)} {unit}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(measurement.date).toLocaleDateString()}
                </span>
              </div>
              {measurement.notes && (
                <p className="mt-1 text-sm text-gray-400">{measurement.notes}</p>
              )}
            </div>
            
            <Button
              size="sm"
              variant="danger-soft"
              onPress={() => onDelete(measurement.id)}
            >
              🗑️
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
>>>>>>> main
