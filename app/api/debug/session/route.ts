import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Debug endpoint to check current session and user role
 * Remove this in production
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      session: session ? {
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
          role: (session.user as any)?.role,
        },
        expires: session.expires,
      } : null,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}