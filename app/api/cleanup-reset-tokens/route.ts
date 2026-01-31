import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/app/actions/password-reset';

/**
 * API route to cleanup expired password reset tokens
 * Can be called manually or via external cron service (e.g., cron-job.org)
 * 
 * SECURITY: Requires CRON_SECRET for authentication
 */
export async function GET(request: NextRequest) {
    try {
        // SECURITY: Require authentication for this endpoint
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
        
        if (!process.env.CRON_SECRET) {
            console.error('[Cleanup API] CRON_SECRET not configured');
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }
        
        if (authHeader !== expectedAuth) {
            console.warn('[Cleanup API] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
