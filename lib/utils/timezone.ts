/**
 * Timezone utility functions for meal reminders
 */

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string = 'Asia/Kolkata') {
  const now = new Date();
  
  // Get time in user's timezone
  const userTime = now.toLocaleString("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const [hour, minute, second] = userTime.split(':').map(Number);
  
  return {
    hour,
    minute,
    second,
    timeString: userTime,
    totalMinutes: hour * 60 + minute,
    timezone
  };
}

/**
 * Parse meal time string to minutes
 */
export function parseMealTimeToMinutes(timeString: string): number {
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * Check if enough time has passed since meal time
 */
export function shouldSendMealReminder(
  mealTimeString: string,
  userTimezone: string,
  hourThreshold: number = 1
): {
  shouldSend: boolean;
  timeSinceMeal: number;
  userCurrentTime: string;
  mealTime: string;
} {
  const userTime = getCurrentTimeInTimezone(userTimezone);
  const mealTimeMinutes = parseMealTimeToMinutes(mealTimeString);
  const timeSinceMeal = userTime.totalMinutes - mealTimeMinutes;
  
  return {
    shouldSend: timeSinceMeal >= (hourThreshold * 60),
    timeSinceMeal,
    userCurrentTime: userTime.timeString,
    mealTime: mealTimeString
  };
}

/**
 * Check if it's time to send good morning notification (7 AM in user's timezone)
 */
export function shouldSendGoodMorningNotification(userTimezone: string): {
  shouldSend: boolean;
  userCurrentTime: string;
  userHour: number;
  userMinute: number;
} {
  const userTime = getCurrentTimeInTimezone(userTimezone);
  
  return {
    shouldSend: userTime.hour === 7,
    userCurrentTime: userTime.timeString,
    userHour: userTime.hour,
    userMinute: userTime.minute
  };
}

/**
 * Check if it's time to send good night notification (8 PM or after dinner time in user's timezone)
 */
export function shouldSendGoodNightNotification(
  userTimezone: string,
  dinnerTime?: string | null
): {
  shouldSend: boolean;
  userCurrentTime: string;
  userHour: number;
  userMinute: number;
  targetHour: number;
} {
  const userTime = getCurrentTimeInTimezone(userTimezone);
  
  // If dinner time is configured, send notification 1 hour after dinner
  // Otherwise, send at 8 PM (20:00)
  let targetHour = 20; // Default to 8 PM
  
  if (dinnerTime) {
    const [dinnerHour] = dinnerTime.split(':').map(Number);
    // Send notification 1 hour after dinner, but not before 8 PM
    targetHour = Math.max(20, dinnerHour + 1);
    // Cap at 11 PM to avoid late night notifications
    targetHour = Math.min(23, targetHour);
  }
  
  return {
    shouldSend: userTime.hour === targetHour,
    userCurrentTime: userTime.timeString,
    userHour: userTime.hour,
    userMinute: userTime.minute,
    targetHour
  };
}

/**
 * Get user's current date in their timezone
 */
export function getCurrentDateInTimezone(timezone: string = 'Asia/Kolkata'): string {
  const now = new Date();
  return now.toLocaleDateString("en-CA", { // ISO format YYYY-MM-DD
    timeZone: timezone
  });
}

/**
 * Common timezone options for UI with UTC offsets (sorted from - to +)
 */
export const COMMON_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT) UTC-8:00/-7:00' },
  { value: 'America/Denver', label: 'US Mountain (MST/MDT) UTC-7:00/-6:00' },
  { value: 'America/Chicago', label: 'US Central (CST/CDT) UTC-6:00/-5:00' },
  { value: 'America/Mexico_City', label: 'Mexico (CST/CDT) UTC-6:00/-5:00' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT) UTC-5:00/-4:00' },
  { value: 'America/Toronto', label: 'Canada Eastern (EST/EDT) UTC-5:00/-4:00' },
  { value: 'America/Sao_Paulo', label: 'Brazil (BRT/BRST) UTC-3:00/-2:00' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time) UTC+0:00' },
  { value: 'Europe/London', label: 'UK (GMT/BST) UTC+0:00/+1:00' },
  { value: 'Europe/Paris', label: 'France (CET/CEST) UTC+1:00/+2:00' },
  { value: 'Europe/Berlin', label: 'Germany (CET/CEST) UTC+1:00/+2:00' },
  { value: 'Europe/Rome', label: 'Italy (CET/CEST) UTC+1:00/+2:00' },
  { value: 'Africa/Lagos', label: 'Nigeria (WAT) UTC+1:00' },
  { value: 'Africa/Cairo', label: 'Egypt (EET/EEST) UTC+2:00/+3:00' },
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST) UTC+2:00' },
  { value: 'Europe/Moscow', label: 'Russia (MSK) UTC+3:00' },
  { value: 'Asia/Dubai', label: 'UAE (GST) UTC+4:00' },
  { value: 'Asia/Karachi', label: 'Pakistan (PKT) UTC+5:00' },
  { value: 'Asia/Kolkata', label: 'India (IST) UTC+5:30' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (BST) UTC+6:00' },
  { value: 'Asia/Bangkok', label: 'Thailand (ICT) UTC+7:00' },
  { value: 'Asia/Jakarta', label: 'Indonesia (WIB) UTC+7:00' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT) UTC+8:00' },
  { value: 'Asia/Shanghai', label: 'China (CST) UTC+8:00' },
  { value: 'Asia/Manila', label: 'Philippines (PST) UTC+8:00' },
  { value: 'Australia/Perth', label: 'Australia Western (AWST) UTC+8:00' },
  { value: 'Asia/Tokyo', label: 'Japan (JST) UTC+9:00' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (AEST/AEDT) UTC+10:00/+11:00' },
  { value: 'Australia/Melbourne', label: 'Australia Victoria (AEST/AEDT) UTC+10:00/+11:00' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST/NZDT) UTC+12:00/+13:00' },
];