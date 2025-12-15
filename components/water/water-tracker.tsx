'use client';

import { Button } from '@heroui/react';
import { useState, useCallback, useMemo, memo } from 'react';

interface WaterTrackerProps {
  count: number;
  totalMl: number;
  targetGlasses?: number;
  onAdd: () => Promise<void>;
  onUpdateTarget?: (target: number) => Promise<void>;
}

export const WaterTracker = memo(function WaterTracker({ 
  count, 
  totalMl, 
  targetGlasses = 14, 
  onAdd, 
  onUpdateTarget
}: WaterTrackerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState(targetGlasses.toString());

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      await onAdd();
    } finally {
      setIsAdding(false);
    }
  }, [onAdd]);

  const handleUpdateTarget = useCallback(async () => {
    const target = parseInt(newTarget);
    if (target > 0 && target <= 50 && onUpdateTarget) {
      await onUpdateTarget(target);
      setIsEditingTarget(false);
    }
  }, [newTarget, onUpdateTarget]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingTarget(false);
    setNewTarget(targetGlasses.toString());
  }, [targetGlasses]);

  const progress = useMemo(() => 
    Math.min((count / targetGlasses) * 100, 100), 
    [count, targetGlasses]
  );

  const totalLiters = useMemo(() => 
    (totalMl / 1000).toFixed(1), 
    [totalMl]
  );

  const goalLiters = useMemo(() => 
    (targetGlasses * 0.25).toFixed(1), 
    [targetGlasses]
  );

  return (
    <div className="bg-content1 rounded-large p-4 shadow-small md:p-6">
      <div className="flex flex-col items-center gap-4 md:gap-6">
        {/* Water Glass Visual */}
        <div className="relative w-24 h-32 md:w-32 md:h-40">
          <svg viewBox="0 0 100 140" className="w-full h-full">
            {/* Glass outline */}
            <path
              d="M 20 10 L 30 130 L 70 130 L 80 10 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-default-300"
            />
            {/* Water fill */}
            <defs>
              <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path
              d={`M 30 ${130 - progress * 1.2} L 30 130 L 70 130 L 70 ${130 - progress * 1.2} Z`}
              fill="url(#waterGradient)"
            />
          </svg>
        </div>

        {/* Count Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-500 md:text-5xl">{count}</div>
          <div className="text-xs text-default-500 mt-0.5 md:text-small md:mt-1">
            glasses today ({totalLiters}L)
          </div>
          {isEditingTarget ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center bg-default-100 rounded border border-default-200 focus:outline-none focus:border-blue-500"
                min="1"
                max="50"
              />
              <Button
                size="sm"
                variant="primary"
                onPress={handleUpdateTarget}
                className="min-w-[60px]"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={handleCancelEdit}
                className="min-w-[60px]"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="text-xs text-default-400 mt-1 md:text-small">
              Goal: {targetGlasses} glasses ({goalLiters}L)
              {onUpdateTarget && (
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="ml-2 text-blue-500 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="h-1.5 bg-default-200 rounded-full overflow-hidden md:h-2">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[10px] text-default-400 text-center mt-0.5 md:text-tiny md:mt-1">
            {progress.toFixed(0)}% of daily goal
          </div>
        </div>



        {/* Add Button */}
        <Button
          variant="primary"
          size="md"
          className="w-full md:size-lg"
          onPress={handleAdd}
          isDisabled={isAdding}
        >
          {isAdding ? 'Adding...' : '+ Add Glass (250ml)'}
        </Button>
      </div>
    </div>
  );
});
