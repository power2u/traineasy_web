import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('Testing Weekly Measurement Reminder notifications...');
    
    const response = await fetch(`http://localhost:3000/api/notifications/weekly-measurement-reminder`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    
    const result = {
      status: response.status,
      data: await response.json()
    };

    return NextResponse.json({
      success: true,
      message: 'Tested weekly measurement reminder notifications',
      result
    });

  } catch (error: any) {
    console.error('Test weekly measurement reminder error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Weekly Measurement Reminder Test Endpoint',
    usage: {
      method: 'POST',
      description: 'Tests the weekly measurement reminder system'
    },
    schedule: {
      frequency: 'Weekly',
      day: 'Sunday',
      time: '10:00 AM (user timezone)',
      description: 'Reminds users to log their weight and body measurements'
    },
    example: 'POST /api/test-weekly-measurement-reminder'
  });
}