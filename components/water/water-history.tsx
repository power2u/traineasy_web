'use client';

import { Button, Card } from '@heroui/react';
import { useState, useCallback, useMemo, memo } from 'react';
import { Droplet } from 'lucide-react';

interface WaterIntakeEntry {
  id: string;
  userId: string;
  timestamp: string;
  glassCount: number;
  createdAt: string;
}

interface WaterHistoryProps {
  entries: WaterIntakeEntry[];
  onDelete: (entryId: string) => Promise<void>;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const entryDate = new Date(date);
  entryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  if (entryDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (entryDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }
};

// Memoized entry component
const WaterEntry = memo(function WaterEntry({ 
  entry, 
  onDelete, 
  isDeleting 
}: { 
  entry: WaterIntakeEntry; 
  onDelete: (id: string) => void; 
  isDeleting: boolean;
}) {
  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Droplet className="h-5 w-5 text-blue-400 md:h-6 md:w-6" />
          <div>
            <div className="text-sm font-medium md:text-base">
              {entry.glassCount} glass{entry.glassCount !== 1 ? 'es' : ''} ({entry.glassCount * 250}ml)
            </div>
            <div className="text-xs text-default-400 md:text-small">
              {formatTime(entry.timestamp)}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          disabled={isDeleting}
          className="text-xs text-danger hover:text-danger-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors md:text-sm"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Card>
  );
});

export const WaterHistory = memo(function WaterHistory({ entries, onDelete }: WaterHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (entryId: string) => {
    setDeletingId(entryId);
    try {
      await onDelete(entryId);
    } finally {
      setDeletingId(null);
    }
  }, [onDelete]);

  // Group entries by date - memoized
  const groupedEntries = useMemo(() => {
    return entries.reduce((groups, entry) => {
      const dateKey = entry.timestamp.split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
      return groups;
    }, {} as Record<string, WaterIntakeEntry[]>);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center md:p-12">
        <div className="text-default-400">
          <Droplet className="h-12 w-12 mb-3 mx-auto text-blue-400/50 md:h-16 md:w-16 md:mb-4" />
          <div className="text-base md:text-large">No water logged yet</div>
          <div className="text-xs mt-1.5 md:text-small md:mt-2">Start tracking your hydration!</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-lg font-semibold md:text-xl">History</h2>
      
      {Object.entries(groupedEntries).map(([dateKey, dateEntries]) => (
        <div key={dateKey}>
          <div className="text-xs font-medium text-default-500 mb-1.5 md:text-small md:mb-2">
            {formatDate(dateKey)}
          </div>
          <div className="space-y-1.5 md:space-y-2">
            {dateEntries.map((entry) => (
              <WaterEntry
                key={entry.id}
                entry={entry}
                onDelete={handleDelete}
                isDeleting={deletingId === entry.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
