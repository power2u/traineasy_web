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
        <p className="text-muted-foreground">No {MEASUREMENT_LABELS[measurementType].toLowerCase()} logs yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">History</h3>
      
      <div className="space-y-2">
        {measurements.map((measurement) => (
          <div
            key={measurement.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-foreground">
                  {measurement.value.toFixed(1)} {unit}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(measurement.date).toLocaleDateString()}
                </span>
              </div>
              {measurement.notes && (
                <p className="mt-1 text-sm text-muted-foreground">{measurement.notes}</p>
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
