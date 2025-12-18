<<<<<<< HEAD
'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, Text, Button, TextField, Label, Input } from '@heroui/react';
import { preferencesService } from '@/lib/services/preferences-service';
import { weightService } from '@/lib/services/weight-service';
import { convertWeight } from '@/lib/utils/unit-conversion';
import { Ruler } from 'lucide-react';

interface BMICardProps {
  userId: string;
  currentWeight: number | null;
  heightCm: number | null;
  unit: 'kg' | 'lbs';
  onUpdate: () => void;
}

const getBMIColor = (category: string) => {
  switch (category) {
    case 'Underweight': return 'text-blue-400';
    case 'Normal': return 'text-green-400';
    case 'Overweight': return 'text-yellow-400';
    case 'Obese': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export const BMICard = memo(function BMICard({ userId, currentWeight, heightCm, unit, onUpdate }: BMICardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newHeight, setNewHeight] = useState(heightCm?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const heightNum = parseFloat(newHeight);
    if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
      setError('Please enter a valid height (50-300 cm)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await preferencesService.setHeight(userId, heightNum);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save height');
    } finally {
      setLoading(false);
    }
  }, [userId, newHeight, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setNewHeight(heightCm?.toString() || '');
    setError(null);
  }, [heightCm]);

  const bmiData = useMemo(() => {
    if (!currentWeight || !heightCm) return null;
    
    // Convert current weight to kg for BMI calculation
    const weightKg = convertWeight(currentWeight, unit, 'kg');
    
    const bmi = weightService.calculateBMI(weightKg, heightCm);
    const category = weightService.getBMICategory(bmi);
    
    return { bmi, category };
  }, [currentWeight, heightCm, unit]);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">BMI Calculator</h3>
        {!isEditing && heightCm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit Height
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <TextField
            value={newHeight}
            onChange={setNewHeight}
            isRequired
            isDisabled={loading}
            type="number"
            inputMode="decimal"
          >
            <Label>Height (cm)</Label>
            <Input placeholder="e.g., 170" step="0.1" />
          </TextField>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSave}
              isDisabled={loading || !newHeight}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Height'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              isDisabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : bmiData ? (
        <div>
          <div className="mb-4 text-center">
            <div className="text-4xl font-bold">{bmiData.bmi.toFixed(1)}</div>
            <Text className={`text-sm font-semibold ${getBMIColor(bmiData.category)}`}>
              {bmiData.category}
            </Text>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <Text className="text-gray-400">Height</Text>
              <Text className="font-semibold">{heightCm} cm</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-400">Weight</Text>
              <Text className="font-semibold">{currentWeight?.toFixed(1)} {unit}</Text>
            </div>
          </div>

          {/* BMI Scale */}
          <div className="mt-4">
            <Text className="mb-2 text-xs text-gray-400">BMI Scale</Text>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-400">Underweight</span>
                <span className="text-gray-400">&lt; 18.5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-400">Normal</span>
                <span className="text-gray-400">18.5 - 24.9</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-400">Overweight</span>
                <span className="text-gray-400">25 - 29.9</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400">Obese</span>
                <span className="text-gray-400">≥ 30</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center flex flex-col sm:flex-row gap-2 items-center mx-auto">
          <Ruler className="h-10 w-10 mb-3 text-purple-400/50" />
          <Text className="mb-4 text-gray-400">
            {!heightCm ? 'Set your height to calculate BMI' : 'Log your weight to see BMI'}
          </Text>
          {!heightCm && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              Set Height
            </Button>
          )}
        </div>
      )}
    </Card>
  );
});
=======
'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, Text, Button, TextField, Label, Input } from '@heroui/react';
import { preferencesService } from '@/lib/services/preferences-service';
import { weightService } from '@/lib/services/weight-service';
import { convertWeight } from '@/lib/utils/unit-conversion';
import { Ruler } from 'lucide-react';

interface BMICardProps {
  userId: string;
  currentWeight: number | null;
  heightCm: number | null;
  unit: 'kg' | 'lbs';
  onUpdate: () => void;
}

const getBMIColor = (category: string) => {
  switch (category) {
    case 'Underweight': return 'text-blue-400';
    case 'Normal': return 'text-green-400';
    case 'Overweight': return 'text-yellow-400';
    case 'Obese': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export const BMICard = memo(function BMICard({ userId, currentWeight, heightCm, unit, onUpdate }: BMICardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newHeight, setNewHeight] = useState(heightCm?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const heightNum = parseFloat(newHeight);
    if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
      setError('Please enter a valid height (50-300 cm)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await preferencesService.setHeight(userId, heightNum);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save height');
    } finally {
      setLoading(false);
    }
  }, [userId, newHeight, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setNewHeight(heightCm?.toString() || '');
    setError(null);
  }, [heightCm]);

  const bmiData = useMemo(() => {
    if (!currentWeight || !heightCm) return null;
    
    // Convert current weight to kg for BMI calculation
    const weightKg = convertWeight(currentWeight, unit, 'kg');
    
    const bmi = weightService.calculateBMI(weightKg, heightCm);
    const category = weightService.getBMICategory(bmi);
    
    return { bmi, category };
  }, [currentWeight, heightCm, unit]);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">BMI Calculator</h3>
        {!isEditing && heightCm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit Height
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <TextField
            value={newHeight}
            onChange={setNewHeight}
            isRequired
            isDisabled={loading}
            type="number"
            inputMode="decimal"
          >
            <Label>Height (cm)</Label>
            <Input placeholder="e.g., 170" step="0.1" />
          </TextField>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={handleSave}
              isDisabled={loading || !newHeight}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Height'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
              isDisabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : bmiData ? (
        <div>
          <div className="mb-4 text-center">
            <div className="text-4xl font-bold">{bmiData.bmi.toFixed(1)}</div>
            <Text className={`text-sm font-semibold ${getBMIColor(bmiData.category)}`}>
              {bmiData.category}
            </Text>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <Text className="text-gray-400">Height</Text>
              <Text className="font-semibold">{heightCm} cm</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text className="text-gray-400">Weight</Text>
              <Text className="font-semibold">{currentWeight?.toFixed(1)} {unit}</Text>
            </div>
          </div>

          {/* BMI Scale */}
          <div className="mt-4">
            <Text className="mb-2 text-xs text-gray-400">BMI Scale</Text>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-blue-400">Underweight</span>
                <span className="text-gray-400">&lt; 18.5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-400">Normal</span>
                <span className="text-gray-400">18.5 - 24.9</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-400">Overweight</span>
                <span className="text-gray-400">25 - 29.9</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400">Obese</span>
                <span className="text-gray-400">≥ 30</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center flex flex-col sm:flex-row gap-2 items-center mx-auto">
          <Ruler className="h-10 w-10 mb-3 text-purple-400/50" />
          <Text className="mb-4 text-gray-400">
            {!heightCm ? 'Set your height to calculate BMI' : 'Log your weight to see BMI'}
          </Text>
          {!heightCm && (
            <Button
              variant="primary"
              onClick={() => setIsEditing(true)}
            >
              Set Height
            </Button>
          )}
        </div>
      )}
    </Card>
  );
});
>>>>>>> main
