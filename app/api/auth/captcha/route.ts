import { NextResponse } from 'next/server';
import { generateMathChallenge, generateHoneypot, generateTimeChallenge } from '@/lib/utils/captcha';
import { rateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

export async function GET(request: Request) {
    try {
        // Rate limiting for CAPTCHA requests
        const rateLimitResult = rateLimit(request, {
            limit: 10,
            windowMs: 60 * 1000 // 10 requests per minute
        });
        
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many CAPTCHA requests' },
                { status: 429 }
            );
        }

        // Generate challenges
        const mathChallenge = generateMathChallenge();
        const honeypot = generateHoneypot();
        const timeToken = generateTimeChallenge();

        return NextResponse.json({
            mathChallenge: {
                question: mathChallenge.question,
                token: mathChallenge.token
            },
            honeypot: {
                fieldName: honeypot.fieldName,
                expectedValue: honeypot.expectedValue
            },
            timeToken,
            // Add some randomization to make it harder for bots
            nonce: Math.random().toString(36).substring(7)
        });

    } catch (error) {
        console.error('[CAPTCHA] Error generating challenge:', error);
        return NextResponse.json(
            { error: 'Failed to generate challenge' },
            { status: 500 }
        );
    }
}