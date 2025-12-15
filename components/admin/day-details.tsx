'use client';

import { Card, Chip } from '@heroui/react';
import { Utensils, Scale, Droplet, Ruler, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface DayDetailsProps {
  date: Date;
  mealLogs: any[];
  weightLogs: any[];
  waterLogs: any[];
  measurements: any[];
  userProfile: any;
}

export function DayDetails({ date, mealLogs, weightLogs, waterLogs, measurements, userProfile }: DayDetailsProps) {
  const dateStr = date.toLocaleDateString('en-CA'); // Use local date consistently
  
  // Helper function to format time in user's local timezone
  const formatTime = (timeString: string | null, isScheduledTime = false) => {
    if (!timeString) return null;
    
    if (isScheduledTime) {
      // Scheduled times are in HH:MM format, convert to 12-hour format
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } else {
      // Timestamps are in ISO format, convert to local time
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true
      });
    }
  };
  
  // Helper function to get local date string from timestamp
  const getLocalDateStr = (timestamp: string) => {
    const localDate = new Date(timestamp);
    return localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
  };
  
  // Get data for the selected date (properly handling timezones)
  const dayMeal = mealLogs.find(meal => meal.date === dateStr);
  // Weight data comes from body_measurements table with measurement_type = 'weight'
  const dayWeight = measurements.filter(measurement => 
    measurement.measurement_type === 'weight' && measurement.date === dateStr
  );
  const dayWater = waterLogs.filter(water => getLocalDateStr(water.timestamp) === dateStr);
  // Non-weight measurements (biceps, chest, waist, etc.)
  const dayMeasurements = measurements.filter(measurement => {
    // Exclude weight measurements as they're handled separately above
    if (measurement.measurement_type === 'weight') return false;
    
    if (measurement.date) {
      return measurement.date === dateStr;
    }
    return false;
  });

  const hasAnyActivity = !!(dayMeal || dayWeight.length || dayWater.length || dayMeasurements.length);

  if (!hasAnyActivity) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-default-100 dark:bg-default-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-default-400 dark:text-default-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Activity</h3>
          <p className="text-default-500">
            No activities recorded for {date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </Card>
    );
  }

  // Calculate meal completion
  const mealActivities = dayMeal ? [
    { name: 'Breakfast', completed: dayMeal.breakfast_completed, time: dayMeal.breakfast_time, scheduled: userProfile.breakfast_time },
    { name: 'Morning Snack', completed: dayMeal.snack1_completed, time: dayMeal.snack1_time, scheduled: userProfile.snack1_time },
    { name: 'Lunch', completed: dayMeal.lunch_completed, time: dayMeal.lunch_time, scheduled: userProfile.lunch_time },
    { name: 'Afternoon Snack', completed: dayMeal.snack2_completed, time: dayMeal.snack2_time, scheduled: userProfile.snack2_time },
    { name: 'Dinner', completed: dayMeal.dinner_completed, time: dayMeal.dinner_time, scheduled: userProfile.dinner_time }
  ] : [];

  const completedMeals = mealActivities.filter(meal => meal.completed).length;
  const mealCompletionRate = mealActivities.length > 0 ? (completedMeals / mealActivities.length) * 100 : 0;

  // Calculate total water intake
  const totalWaterGlasses = dayWater.reduce((sum, log) => sum + log.glass_count, 0);
  const totalWaterMl = totalWaterGlasses * (userProfile.glass_size_ml || 250);
  const waterTarget = (userProfile.daily_water_target || 8) * (userProfile.glass_size_ml || 250);
  const waterCompletionRate = waterTarget > 0 ? Math.min((totalWaterMl / waterTarget) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Day Header */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <p className="text-default-500 text-sm">Daily Activity Summary</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dayMeal && (
              <Chip size="sm" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                {completedMeals}/5 Meals
              </Chip>
            )}
            {dayWeight.length > 0 && (
              <Chip size="sm" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                Weight Logged
              </Chip>
            )}
            {dayWater.length > 0 && (
              <Chip size="sm" className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200">
                {totalWaterGlasses} Glasses
              </Chip>
            )}
          </div>
        </div>
      </Card>

      {/* Meal Activity */}
      {dayMeal && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Utensils className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Meal Activity</h3>
                <p className="text-xs text-default-500">{completedMeals} of 5 meals completed</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{mealCompletionRate.toFixed(0)}%</div>
              <div className="w-16 h-1.5 bg-default-200 dark:bg-default-700 rounded-full mt-1">
                <div 
                  className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                  style={{ width: `${mealCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mealActivities.map((meal, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  meal.completed 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                    : 'border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{meal.name}</span>
                  {meal.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-default-400 flex-shrink-0" />
                  )}
                </div>
                
                <div className="space-y-0.5 text-xs text-default-600 dark:text-default-300">
                  {meal.scheduled && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate"> {formatTime(meal.scheduled, true)}</span>
                    </div>
                  )}
                  {meal.completed && meal.time && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="truncate"> {formatTime(meal.time)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weight Logs */}
      {dayWeight.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Weight Logs</h3>
              <p className="text-xs text-default-500">{dayWeight.length} entries</p>
            </div>
          </div>

          <div className="space-y-2">
            {dayWeight.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{log.value} {log.unit}</div>
                  <div className="text-xs text-default-500 dark:text-default-400">
                    {formatTime(log.created_at)}
                  </div>
                </div>
                {log.notes && (
                  <div className="text-xs text-default-600 dark:text-default-300 max-w-32 truncate">
                    {log.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Water Intake */}
      {dayWater.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
                <Droplet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Water Intake</h3>
                <p className="text-xs text-default-500">{dayWater.length} entries • {totalWaterGlasses} glasses</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{waterCompletionRate.toFixed(0)}%</div>
              <div className="text-xs text-default-500">{totalWaterMl.toLocaleString()} ml</div>
              <div className="w-16 h-1.5 bg-default-200 dark:bg-default-700 rounded-full mt-1">
                <div 
                  className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${waterCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {dayWater.map((log, index) => (
              <div key={index} className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-center">
                <div className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{log.glass_count}</div>
                <div className="text-xs text-default-500 dark:text-default-400">
                  {formatTime(log.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Body Measurements */}
      {dayMeasurements.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Ruler className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Body Measurements</h3>
              <p className="text-xs text-default-500">{dayMeasurements.length} measurements</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dayMeasurements.map((measurement, index) => (
              <div key={index} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium capitalize text-sm">
                      {measurement.measurement_type.replace('_', ' ')}
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {measurement.value} {measurement.unit}
                    </div>
                  </div>
                  <div className="text-right text-xs text-default-500 dark:text-default-400">
                    {formatTime(measurement.updated_at)}
                  </div>
                </div>
                {measurement.notes && (
                  <div className="text-xs text-default-600 dark:text-default-300 mt-1 truncate">
                    {measurement.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}