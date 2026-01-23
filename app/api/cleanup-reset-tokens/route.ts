import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/app/actions/password-reset';

/**
 * API route to cleanup expired password reset tokens
 * Can be called manually or via external cron service (e.g., cron-job.org)
 * 
 * For security, you should add authentication here in production
 * Example: Check for a secret token in headers
 */
export async function GET(request: NextRequest) {
    try {
        // Optional: Add authentication
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const result = await cleanupExpiredTokens();

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Expired tokens cleaned up successfully',
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[Cleanup API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to cleanup tokens',
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Support both GET and POST for flexibility
    return GET(request);
}
