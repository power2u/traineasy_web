'use client';

import { useAuthUser } from '@/lib/contexts/auth-context';
import { useIncompleteMeals } from '@/lib/hooks/use-meal-notifications';
import { Clock, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

/**
 * Incomplete Meals Banner
 * 
 * Shows a dismissible banner when user has incomplete meals
 * Displays on dashboard or other pages to remind users
 */
export function IncompleteMealsBanner() {
  const user = useAuthUser();
  const incompleteMeals = useIncompleteMeals(user?.id);
  const [dismissed, setDismissed] = useState(false);

  if (!user || incompleteMeals.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-warning-900 dark:text-warning-100 mb-1">
            Incomplete Meals
          </h3>
          <p className="text-xs text-warning-700 dark:text-warning-300 mb-2">
            You have {incompleteMeals.length} meal{incompleteMeals.length > 1 ? 's' : ''} to log:
          </p>
          
          <div className="flex flex-wrap gap-2">
            {incompleteMeals.map((meal) => (
              <div
                key={meal.type}
                className="inline-flex items-center gap-1 px-2 py-1 bg-warning-100 dark:bg-warning-900/50 rounded text-xs text-warning-800 dark:text-warning-200"
              >
                <span className="font-medium">{meal.label}</span>
                <span className="text-warning-600 dark:text-warning-400">({meal.time})</span>
              </div>
            ))}
          </div>
          
          <Link
            href="/meals"
            className="inline-block mt-3 text-xs font-medium text-warning-700 dark:text-warning-300 hover:text-warning-900 dark:hover:text-warning-100 underline"
          >
            Go to Meals Tracker →
          </Link>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 hover:bg-warning-100 dark:hover:bg-warning-900/50 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-warning-600 dark:text-warning-400" />
        </button>
      </div>
    </div>
  );
}
