'use client';

import { useState } from 'react';
import { Button, Card, TextField, Label, Input, TextArea } from '@heroui/react';
import { MEASUREMENT_LABELS, type MeasurementType } from '@/lib/types';

interface MeasurementFormProps {
  measurementType: MeasurementType;
  unit: 'kg' | 'lbs' | 'cm' | 'in';
  onSubmit: (value: number, notes?: string) => Promise<void>;
  canLogToday: boolean;
}

export function MeasurementForm({ measurementType, unit, onSubmit, canLogToday }: MeasurementFormProps) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    setLoading(true);
    try {
      await onSubmit(numValue, notes || undefined);
      setValue('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  if (!canLogToday) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="mb-3 text-4xl">✅</div>
          <h3 className="mb-2 text-lg font-semibold">Already Logged Today</h3>
          <p className="text-sm text-gray-400">
            You've already logged this measurement today. Come back tomorrow!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Log {MEASUREMENT_LABELS[measurementType]}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          value={value}
          onChange={setValue}
          isRequired
          isDisabled={loading}
          type="number"
          inputMode="decimal"
        >
          <Label>{MEASUREMENT_LABELS[measurementType]} ({unit})</Label>
          <Input
            placeholder="0.0"
            step="0.1"
          />
        </TextField>

        <TextField value={notes} onChange={setNotes} isDisabled={loading}>
          <Label>Notes (optional)</Label>
          <TextArea
            placeholder="Add any notes..."
            rows={2}
          />
        </TextField>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isDisabled={loading || !value}
        >
          {loading ? 'Saving...' : 'Save Measurement'}
        </Button>
      </form>
    </Card>
  );
}
