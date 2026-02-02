/**
 * Timezone utility functions
 */

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string = 'Asia/Kolkata') {
  const now = new Date();

  // Check if timezone is an offset string (e.g., "+05:30" or "-04:00")
  const offsetMatch = timezone.match(/^([+-])(\d{2}):(\d{2})$/);

  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3], 10);
    const totalOffsetMinutes = sign * (hours * 60 + minutes);

    // Create date object shifted by the offset
    // Get UTC time in ms
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    // Add target offset
    const targetMs = utcMs + (totalOffsetMinutes * 60000);
    const targetDate = new Date(targetMs);

    const h = targetDate.getHours();
    const m = targetDate.getMinutes();
    const s = targetDate.getSeconds();

    const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    return {
      hour: h,
      minute: m,
      second: s,
      timeString: timeString,
      totalMinutes: h * 60 + m,
      timezone
    };
  }

  // Fallback to IANA timezone
  try {
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
  } catch (e) {
    // If invalid timezone, default to UTC
    console.error(`Invalid timezone: ${timezone}, defaulting to UTC`);
    return getCurrentTimeInTimezone('UTC');
  }
}

/**
 * Parse meal time string to minutes
 */
export function parseMealTimeToMinutes(timeString: string): number {
  const [hour, minute] = timeString.split(':').map(Number);
  return hour * 60 + minute;
}

/**
 * Get user's current date in their timezone
 */
export function getCurrentDateInTimezone(timezone: string = 'Asia/Kolkata'): string {
  const now = new Date();

  // Check if timezone is an offset string (e.g., "+05:30" or "-04:00")
  const offsetMatch = timezone.match(/^([+-])(\d{2}):(\d{2})$/);

  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[2], 10);
    const minutes = parseInt(offsetMatch[3], 10);
    const totalOffsetMinutes = sign * (hours * 60 + minutes);

    // Get UTC time in ms
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    // Add target offset
    const targetMs = utcMs + (totalOffsetMinutes * 60000);
    const targetDate = new Date(targetMs);

    // Return YYYY-MM-DD
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fallback for IANA timezones
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