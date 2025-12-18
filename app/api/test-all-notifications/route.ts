import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { simulate } = body;
    
    console.log('Testing all notification systems...');
    
    const results: any = {};

    // Test Daily Notifications (Good Morning & Good Night)
    console.log('1. Testing Daily Notifications...');
    const dailyResponse = await fetch(`http://localhost:3000/api/test-daily-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'both' })
    });
    
    results.daily = {
      status: dailyResponse.status,
      data: await dailyResponse.json()
    };

    // Test Weekly Measurement Reminders
    console.log('2. Testing Weekly Measurement Reminders...');
    const weeklyResponse = await fetch(`http://localhost:3000/api/test-weekly-measurement-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    results.weekly = {
      status: weeklyResponse.status,
      data: await weeklyResponse.json()
    };

    // Test Meal Reminders (existing system)
    console.log('3. Testing Meal Reminders...');
    const mealResponse = await fetch(`http://localhost:3000/api/notifications/check-and-send`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    
    results.meals = {
      status: mealResponse.status,
      data: await mealResponse.json()
    };

    // Summary
    const summary = {
      dailyNotifications: {
        morning: results.daily?.data?.results?.morning?.data?.notificationsSent || 0,
        night: results.daily?.data?.results?.night?.data?.notificationsSent || 0,
        totalUsers: results.daily?.data?.results?.morning?.data?.totalUsers || 0
      },
      weeklyMeasurements: {
        sent: results.weekly?.data?.result?.data?.notificationsSent || 0,
        totalUsers: results.weekly?.data?.result?.data?.totalUsers || 0
      },
      mealReminders: {
        sent: results.meals?.data?.sent || 0,
        checked: results.meals?.data?.checked || 0
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Tested all notification systems',
      timestamp: new Date().toISOString(),
      summary,
      detailed: results,
      notes: {
        daily: 'Good Morning (7 AM) and Good Night (8 PM) notifications based on user timezone',
        weekly: 'Weekly measurement reminders sent on Sunday at 10 AM (user timezone)',
        meals: 'Meal reminders sent 1 hour after scheduled meal times if not completed'
      }
    });

  } catch (error: any) {
    console.error('Test all notifications error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Complete Notification System Test Endpoint',
    systems: {
      daily: {
        description: 'Good Morning (7 AM) and Good Night (8 PM) notifications',
        frequency: 'Daily',
        timezone: 'User-specific'
      },
      weekly: {
        description: 'Weight and body measurement reminders',
        frequency: 'Weekly (Sunday 10 AM)',
        timezone: 'User-specific'
      },
      meals: {
        description: 'Meal completion reminders',
        frequency: 'Hourly check for overdue meals',
        timezone: 'User-specific'
      }
    },
    usage: {
      method: 'POST',
      description: 'Tests all notification systems at once'
    },
    example: 'POST /api/test-all-notifications'
  });
}