import { NextResponse } from 'next/server';
import { 
  shouldSendGoodMorningNotification, 
  shouldSendGoodNightNotification,
  getCurrentTimeInTimezone,
  COMMON_TIMEZONES 
} from '@/lib/utils/timezone';

export async function GET() {
  try {
    const results = [];
    
    // Test with a few different timezones
    const testTimezones = [
      'America/New_York',
      'Europe/London', 
      'Asia/Kolkata',
      'Asia/Tokyo',
      'Australia/Sydney'
    ];
    
    for (const timezone of testTimezones) {
      const currentTime = getCurrentTimeInTimezone(timezone);
      const morningCheck = shouldSendGoodMorningNotification(timezone);
      const nightCheck = shouldSendGoodNightNotification(timezone);
      const nightCheckWithDinner = shouldSendGoodNightNotification(timezone, '19:30'); // 7:30 PM dinner
      
      results.push({
        timezone,
        currentTime: currentTime.timeString,
        currentHour: currentTime.hour,
        shouldSendMorning: morningCheck.shouldSend,
        shouldSendNight: nightCheck.shouldSend,
        nightTargetHour: nightCheck.targetHour,
        shouldSendNightAfterDinner: nightCheckWithDinner.shouldSend,
        nightAfterDinnerTargetHour: nightCheckWithDinner.targetHour
      });
    }
    
    return NextResponse.json({
      success: true,
      testResults: results,
      utcTime: new Date().toISOString(),
      availableTimezones: COMMON_TIMEZONES.length
    });
    
  } catch (error: any) {
    console.error('Timezone test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}