'use client';

import { WeightLog } from '@/lib/types';
import { Card, Text, Button } from '@heroui/react';
import { useState } from 'react';
import { convertWeight } from '@/lib/utils/unit-conversion';
import { Scale } from 'lucide-react';

interface WeightHistoryProps {
  logs: WeightLog[];
  unit: 'kg' | 'lbs';
  onDelete: (logId: string) => Promise<void>;
}

export function WeightHistory({ logs, unit, onDelete }: WeightHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this weight log?')) {
      return;
    }

    setDeletingId(logId);
    try {
      await onDelete(logId);
    } catch (err) {
      alert('Failed to delete log');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logDate = new Date(date);
    
    if (logDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (logDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return logDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: logDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getWeightChange = (index: number) => {
    if (index === logs.length - 1) return null;
    
    // Convert both weights to the display unit for accurate comparison
    const currentWeight = convertWeight(logs[index].weight, logs[index].unit, unit);
    const previousWeight = convertWeight(logs[index + 1].weight, logs[index + 1].unit, unit);
    const change = currentWeight - previousWeight;
    
    return {
      value: change,
      isPositive: change > 0,
      isNegative: change < 0,
    };
  };

  if (logs.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Scale className="h-12 w-12 mb-3 mx-auto text-green-400/50" />
        <Text className="text-gray-400">No weight logs yet</Text>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="mb-4 text-lg font-semibold">History</h3>
      
      <div className="space-y-3">
        {logs.map((log, index) => {
          const change = getWeightChange(index);
          
          return (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold">
                    {convertWeight(log.weight, log.unit, unit).toFixed(1)} {unit}
                  </div>
                  {change && (
                    <div
                      className={`text-sm font-medium ${
                        change.isPositive
                          ? 'text-red-400'
                          : change.isNegative
                          ? 'text-green-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {change.isPositive ? '+' : ''}
                      {change.value.toFixed(1)} {unit}
                    </div>
                  )}
                </div>
                <Text className="mt-1 text-xs text-gray-400">
                  {formatDate(log.date)}
                </Text>
                {log.notes && (
                  <Text className="mt-1 text-sm text-gray-300">
                    {log.notes}
                  </Text>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(log.id)}
                isDisabled={deletingId === log.id}
                className="text-red-400 hover:text-red-300"
              >
                {deletingId === log.id ? '...' : '🗑️'}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
