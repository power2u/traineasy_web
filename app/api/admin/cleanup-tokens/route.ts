import { NextResponse } from 'next/server';
import { runFcmTokenCleanupJob } from './job';

export async function POST() {
  try {
    const result = await runFcmTokenCleanupJob();

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Token cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
