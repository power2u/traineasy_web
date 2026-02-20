import { NextResponse } from 'next/server';
import { sendCustomNotificationToActiveUsers } from './job';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await sendCustomNotificationToActiveUsers(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Custom notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
