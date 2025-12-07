'use client';

import { useState, useCallback, memo } from 'react';
import { Button, Card, TextField, Label, Input, TextArea } from '@heroui/react';

interface WeightLogFormProps {
  unit: 'kg' | 'lbs';
  onSubmit: (weight: number, notes?: string) => Promise<void>;
  canLogToday: boolean;
}

export const WeightLogForm = memo(function WeightLogForm({ unit, onSubmit, canLogToday }: WeightLogFormProps) {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    if (unit === 'kg' && (weightNum < 20 || weightNum > 300)) {
      setError('Weight must be between 20 and 300 kg');
      return;
    }

    if (unit === 'lbs' && (weightNum < 44 || weightNum > 660)) {
      setError('Weight must be between 44 and 660 lbs');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(weightNum, notes || undefined);
      setWeight('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to log weight');
    } finally {
      setLoading(false);
    }
  }, [weight, notes, unit, onSubmit]);

  if (!canLogToday) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="mb-3 text-4xl">✅</div>
          <h3 className="mb-2 text-lg font-semibold">Already Logged Today</h3>
          <p className="text-sm text-gray-400">
            You've already logged your weight today. Come back tomorrow to log again!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="mb-4 text-lg font-semibold">Log Today's Weight</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          value={weight}
          onChange={setWeight}
          isRequired
          isDisabled={loading}
          type="number"
          inputMode="decimal"
        >
          <Label>Weight ({unit})</Label>
          <Input
            placeholder={unit === 'kg' ? 'e.g., 70.5' : 'e.g., 155.5'}
            step="0.1"
          />
        </TextField>

        <TextField value={notes} onChange={setNotes} isDisabled={loading}>
          <Label>Notes (optional)</Label>
          <TextArea
            placeholder="How are you feeling? Any changes?"
            rows={3}
          />
        </TextField>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isDisabled={loading || !weight}
        >
          {loading ? 'Logging...' : 'Log Weight'}
        </Button>
      </form>
    </Card>
  );
});
