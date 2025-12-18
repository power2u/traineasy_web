<<<<<<< HEAD
'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Card, Text, Button, TextField, Label, Input } from '@heroui/react';
import { preferencesService } from '@/lib/services/preferences-service';

interface GoalWeightCardProps {
  userId: string;
  currentWeight: number | null;
  startingWeight: number | null;
  goalWeight: number | null;
  unit: 'kg' | 'lbs';
  onUpdate: () => void;
}

export const GoalWeightCard = memo(function GoalWeightCard({ userId, currentWeight, startingWeight, goalWeight, unit, onUpdate }: GoalWeightCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newGoal, setNewGoal] = useState(goalWeight?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const goalNum = parseFloat(newGoal);
    if (isNaN(goalNum) || goalNum <= 0) {
      setError('Please enter a valid goal weight');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await preferencesService.setGoalWeight(userId, goalNum, unit);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  }, [userId, newGoal, unit, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setNewGoal(goalWeight?.toString() || '');
    setError(null);
  }, [goalWeight]);

  const progress = useMemo(() => {
    if (!currentWeight || !goalWeight || !startingWeight) return null;
    
    const remaining = Math.abs(currentWeight - goalWeight);
    const isGoalLower = goalWeight < startingWeight;
    
    // Calculate progress based on starting weight
    const totalToChange = Math.abs(startingWeight - goalWeight);
    const changedSoFar = Math.abs(startingWeight - currentWeight);
    const percentage = totalToChange > 0 ? Math.min(100, (changedSoFar / totalToChange) * 100) : 0;
    
    return {
      remaining,
      isGoalLower,
      percentage,
      totalToChange,
      changedSoFar,
    };
  }, [currentWeight, goalWeight, startingWeight]);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Goal Weight</h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {goalWeight ? 'Edit' : 'Set Goal'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <TextField
            value={newGoal}
            onChange={setNewGoal}
            isRequired
            isDisabled={loading}
            type="number"
            inputMode="decimal"
          >
            <Label>Goal Weight ({unit})</Label>
            <Input placeholder={`e.g., ${unit === 'kg' ? '70' : '155'}`} step="0.1" />
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
              isDisabled={loading || !newGoal}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Goal'}
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
      ) : goalWeight ? (
        <div>
          <div className="mb-4 text-center">
            <div className="text-4xl font-bold">{goalWeight.toFixed(1)} {unit}</div>
            <Text className="text-sm text-gray-400">Target weight</Text>
          </div>

          {progress && currentWeight && startingWeight && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Starting</Text>
                <Text className="font-semibold">{startingWeight.toFixed(1)} {unit}</Text>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Current</Text>
                <Text className="font-semibold">{currentWeight.toFixed(1)} {unit}</Text>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Remaining</Text>
                <Text className="font-semibold">
                  {progress.remaining.toFixed(1)} {unit}
                </Text>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <Text className="text-gray-400">Progress</Text>
                  <Text className="font-semibold text-blue-400">
                    {progress.percentage.toFixed(0)}%
                  </Text>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${progress.percentage}%`
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{progress.changedSoFar.toFixed(1)} {unit} lost</span>
                  <span>{progress.totalToChange.toFixed(1)} {unit} total</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <Text className="text-gray-400">Set a goal weight to track your progress</Text>
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

interface GoalWeightCardProps {
  userId: string;
  currentWeight: number | null;
  startingWeight: number | null;
  goalWeight: number | null;
  unit: 'kg' | 'lbs';
  onUpdate: () => void;
}

export const GoalWeightCard = memo(function GoalWeightCard({ userId, currentWeight, startingWeight, goalWeight, unit, onUpdate }: GoalWeightCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newGoal, setNewGoal] = useState(goalWeight?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const goalNum = parseFloat(newGoal);
    if (isNaN(goalNum) || goalNum <= 0) {
      setError('Please enter a valid goal weight');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await preferencesService.setGoalWeight(userId, goalNum, unit);
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  }, [userId, newGoal, unit, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setNewGoal(goalWeight?.toString() || '');
    setError(null);
  }, [goalWeight]);

  const progress = useMemo(() => {
    if (!currentWeight || !goalWeight || !startingWeight) return null;
    
    const remaining = Math.abs(currentWeight - goalWeight);
    const isGoalLower = goalWeight < startingWeight;
    
    // Calculate progress based on starting weight
    const totalToChange = Math.abs(startingWeight - goalWeight);
    const changedSoFar = Math.abs(startingWeight - currentWeight);
    const percentage = totalToChange > 0 ? Math.min(100, (changedSoFar / totalToChange) * 100) : 0;
    
    return {
      remaining,
      isGoalLower,
      percentage,
      totalToChange,
      changedSoFar,
    };
  }, [currentWeight, goalWeight, startingWeight]);

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Goal Weight</h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            {goalWeight ? 'Edit' : 'Set Goal'}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <TextField
            value={newGoal}
            onChange={setNewGoal}
            isRequired
            isDisabled={loading}
            type="number"
            inputMode="decimal"
          >
            <Label>Goal Weight ({unit})</Label>
            <Input placeholder={`e.g., ${unit === 'kg' ? '70' : '155'}`} step="0.1" />
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
              isDisabled={loading || !newGoal}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Goal'}
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
      ) : goalWeight ? (
        <div>
          <div className="mb-4 text-center">
            <div className="text-4xl font-bold">{goalWeight.toFixed(1)} {unit}</div>
            <Text className="text-sm text-gray-400">Target weight</Text>
          </div>

          {progress && currentWeight && startingWeight && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Starting</Text>
                <Text className="font-semibold">{startingWeight.toFixed(1)} {unit}</Text>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Current</Text>
                <Text className="font-semibold">{currentWeight.toFixed(1)} {unit}</Text>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <Text className="text-gray-400">Remaining</Text>
                <Text className="font-semibold">
                  {progress.remaining.toFixed(1)} {unit}
                </Text>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <Text className="text-gray-400">Progress</Text>
                  <Text className="font-semibold text-blue-400">
                    {progress.percentage.toFixed(0)}%
                  </Text>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${progress.percentage}%`
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{progress.changedSoFar.toFixed(1)} {unit} lost</span>
                  <span>{progress.totalToChange.toFixed(1)} {unit} total</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <Text className="text-gray-400">Set a goal weight to track your progress</Text>
        </div>
      )}
    </Card>
  );
});
>>>>>>> main
