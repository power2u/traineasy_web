'use client';

import { useState, useMemo } from 'react';
import { Card, Button } from '@heroui/react';
import { ChevronLeft, ChevronRight, Ruler } from 'lucide-react';

interface ActivityData {
  mealLogs: any[];
  weightLogs: any[];
  waterLogs: any[];
  measurements: any[];
}

interface ActivityCalendarProps {
  data: ActivityData;
  onDateSelect: (date: Date) => void;
  selectedDate?: Date;
}

export function ActivityCalendar({ data, onDateSelect, selectedDate }: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Debug logging for data received
  console.log('ActivityCalendar received data:', {
    mealLogs: data.mealLogs.length,
    weightLogs: data.weightLogs.length, // Weight data from body_measurements
    waterLogs: data.waterLogs.length,
    measurements: data.measurements.length,
    weightMeasurements: data.measurements.filter(m => m.measurement_type === 'weight').length,
    nonWeightMeasurements: data.measurements.filter(m => m.measurement_type !== 'weight').length,
    sampleMeasurement: data.measurements[0]
  });

  // Helper function to get local date string from timestamp
  const getLocalDateStr = (timestamp: string) => {
    const localDate = new Date(timestamp);
    return localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
  };

  // Get activity data for a specific date
  const getActivityForDate = (date: Date) => {
    const dateStr = date.toLocaleDateString('en-CA'); // Use local date consistently
    
    // Debug logging for measurements
    if (data.measurements.length > 0) {
      console.log('Sample measurement data:', data.measurements[0]);
      console.log('Looking for date:', dateStr);
    }
    
    const mealActivity = data.mealLogs.find(meal => meal.date === dateStr);
    // Weight data comes from body_measurements table with measurement_type = 'weight'
    const weightActivity = data.measurements.filter(measurement => 
      measurement.measurement_type === 'weight' && measurement.date === dateStr
    );
    const waterActivity = data.waterLogs.filter(water => 
      getLocalDateStr(water.timestamp) === dateStr
    );
    // Non-weight measurements (biceps, chest, waist, etc.)
    const measurementActivity = data.measurements.filter(measurement => {
      // Exclude weight measurements as they're handled separately above
      if (measurement.measurement_type === 'weight') return false;
      
      // Body measurements table uses 'date' field directly (YYYY-MM-DD format)
      if (measurement.date) {
        const matches = measurement.date === dateStr;
        if (matches) {
          console.log('Found measurement match:', { measurementDate: measurement.date, searchDate: dateStr, measurement });
        }
        return matches;
      }
      return false;
    });

    return {
      meals: mealActivity,
      weight: weightActivity,
      water: waterActivity,
      measurements: measurementActivity,
      hasActivity: !!(mealActivity || weightActivity.length || waterActivity.length || measurementActivity.length)
    };
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  return (
    <Card className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              const today = new Date();
              setCurrentMonth(today);
              onDateSelect(today);
            }}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-default-500 dark:text-default-400">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((date, index) => {
          const activity = getActivityForDate(date);
          const mealCompletion = activity.meals ? 
            [
              activity.meals.breakfast_completed,
              activity.meals.snack1_completed,
              activity.meals.lunch_completed,
              activity.meals.snack2_completed,
              activity.meals.dinner_completed
            ].filter(Boolean).length : 0;

          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              className={`
                relative p-2 h-16 rounded-lg border transition-all hover:bg-default-100 dark:hover:bg-default-800
                ${isSelected(date) ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600' : 'border-default-200 dark:border-default-700'}
                ${!isCurrentMonth(date) ? 'text-default-300 dark:text-default-600' : 'text-default-900 dark:text-default-100'}
                ${isToday(date) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}
              `}
            >
              <div className="text-sm font-medium">{date.getDate()}</div>
              
              {/* Activity Indicators */}
              <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1">
                {/* Meal Activity */}
                {activity.meals && (
                  <div className={`w-2 h-2 rounded-full ${
                    mealCompletion >= 4 ? 'bg-green-500' :
                    mealCompletion >= 2 ? 'bg-yellow-500' :
                    mealCompletion >= 1 ? 'bg-orange-500' : 'bg-red-300'
                  }`} />
                )}
                
                {/* Weight Activity */}
                {activity.weight.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
                
                {/* Water Activity */}
                {activity.water.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-cyan-500" />
                )}
                
                {/* Measurement Activity */}
                {activity.measurements.length > 0 && (
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-default-500 dark:text-default-400 pt-4 border-t border-default-200 dark:border-default-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Meals (4-5 completed)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Meals (2-3 completed)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Meals (1 completed)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Weight logged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span>Water logged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Measurements</span>
        </div>
      </div>

      {/* Selected Date Measurements */}
      {selectedDate && (() => {
        const selectedActivity = getActivityForDate(selectedDate);
        return selectedActivity.measurements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-default-200 dark:border-default-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Ruler className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-sm font-semibold">
                Measurements for {selectedDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedActivity.measurements.map((measurement, index) => (
                <div key={index} className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-xs font-medium capitalize text-purple-700 dark:text-purple-300">
                    {measurement.measurement_type.replace('_', ' ')}
                  </div>
                  <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {measurement.value} {measurement.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </Card>
  );
}