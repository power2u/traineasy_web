import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { type } = await request.json();
    
    if (!type || !['morning', 'night', 'both'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Use "morning", "night", or "both"' },
        { status: 400 }
      );
    }

    const results: any = {};

    if (type === 'morning' || type === 'both') {
      console.log('Testing Good Morning notifications...');
      const morningResponse = await fetch(`http://localhost:3000/api/notifications/good-morning`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      });
      
      results.morning = {
        status: morningResponse.status,
        data: await morningResponse.json()
      };
    }

    if (type === 'night' || type === 'both') {
      console.log('Testing Good Night notifications...');
      const nightResponse = await fetch(`http://localhost:3000/api/notifications/good-night`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      });
      
      results.night = {
        status: nightResponse.status,
        data: await nightResponse.json()
      };
    }

    return NextResponse.json({
      success: true,
      message: `Tested ${type} notifications`,
      results
    });

  } catch (error: any) {
    console.error('Test daily notifications error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Daily Notifications Test Endpoint',
    usage: {
      method: 'POST',
      body: {
        type: '"morning" | "night" | "both"'
      }
    },
    examples: [
      'POST /api/test-daily-notifications with body: {"type": "morning"}',
      'POST /api/test-daily-notifications with body: {"type": "night"}',
      'POST /api/test-daily-notifications with body: {"type": "both"}'
    ]
  });
}