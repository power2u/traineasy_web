

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/utils/server-auth';
import { analyzeRequest, getBotDetectionStats, getWhitelist, addToWhitelist, removeFromWhitelist } from '@/lib/utils/bot-detection';
import { getClientIdentifier } from '@/lib/utils/rate-limit';

export async function GET(request: Request) {
    try {
        // Require admin access for debugging
        const { user, error } = await requireAdmin();
        if (error) return error;

        const url = new URL(request.url);
        const action = url.searchParams.get('action');

        if (action === 'stats') {
            const stats = getBotDetectionStats();
            return NextResponse.json({
                stats,
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'whitelist') {
            const whitelist = getWhitelist();
            return NextResponse.json({
                whitelist,
                timestamp: new Date().toISOString()
            });
        }

        // Default: analyze current request
        const clientIP = getClientIdentifier(request);
        const analysis = analyzeRequest(request, clientIP);
        const stats = getBotDetectionStats();

        return NextResponse.json({
            analysis,
            stats,
            whitelist: getWhitelist(),
            timestamp: new Date().toISOString(),
            note: 'This endpoint helps debug bot detection rules'
        });

    } catch (error) {
        console.error('[Bot Debug] Error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze request' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        // Require admin access
        const { user, error } = await requireAdmin();
        if (error) return error;

        const body = await request.json();
        const { userAgent, testIP, action, whitelistUserAgent } = body;

        // Handle whitelist management
        if (action === 'addWhitelist' && whitelistUserAgent) {
            addToWhitelist(whitelistUserAgent);
            return NextResponse.json({
                success: true,
                message: `Added "${whitelistUserAgent}" to whitelist`,
                whitelist: getWhitelist(),
                timestamp: new Date().toISOString()
            });
        }

        if (action === 'removeWhitelist' && whitelistUserAgent) {
            removeFromWhitelist(whitelistUserAgent);
            return NextResponse.json({
                success: true,
                message: `Removed "${whitelistUserAgent}" from whitelist`,
                whitelist: getWhitelist(),
                timestamp: new Date().toISOString()
            });
        }

        // Handle user agent testing
        if (!userAgent) {
            return NextResponse.json(
                { error: 'userAgent is required for testing' },
                { status: 400 }
            );
        }

        // Create a mock request for testing
        const mockRequest = new Request('http://localhost:3000/test', {
            method: body.method || 'GET',
            headers: {
                'user-agent': userAgent,
                'accept': body.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'accept-language': body.acceptLanguage || 'en-US,en;q=0.5',
                'accept-encoding': body.acceptEncoding || 'gzip, deflate',
                ...(body.referer && { 'referer': body.referer }),
                ...(body.origin && { 'origin': body.origin }),
                ...(body.contentType && { 'content-type': body.contentType })
            }
        });

        const analysis = analyzeRequest(mockRequest, testIP);

        return NextResponse.json({
            analysis,
            input: { userAgent, testIP, method: body.method || 'GET' },
            testScenario: {
                wouldBlock: analysis.botDetection.isBot && analysis.botDetection.confidence >= 85,
                blockingThreshold: 85,
                currentThreshold: parseInt(process.env.BOT_DETECTION_THRESHOLD || '70')
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Bot Debug] Error:', error);
        return NextResponse.json(
            { error: 'Failed to test user agent' },
            { status: 500 }
        );
    }
}