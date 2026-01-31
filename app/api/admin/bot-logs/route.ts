import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/utils/server-auth';

// In a real application, you'd store these in a database
// For now, we'll use in-memory storage (will reset on server restart)
const botLogs: Array<{
  timestamp: string;
  ip: string;
  userAgent: string;
  confidence: number;
  reason: string;
  blocked: boolean;
  path: string;
}> = [];

export async function GET(request: Request) {
    try {
        // Require admin access
        const { user, error } = await requireAdmin();
        if (error) return error;

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Get recent logs (in reverse chronological order)
        const recentLogs = botLogs
            .slice(-1000) // Keep last 1000 logs
            .reverse()
            .slice(offset, offset + limit);

        const stats = {
            totalLogs: botLogs.length,
            recentBlocked: botLogs.filter(log => 
                log.blocked && 
                new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length,
            recentDetected: botLogs.filter(log => 
                new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length,
            topUserAgents: getTopUserAgents(botLogs.slice(-100)),
            topIPs: getTopIPs(botLogs.slice(-100))
        };

        return NextResponse.json({
            logs: recentLogs,
            stats,
            pagination: {
                limit,
                offset,
                total: botLogs.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Bot Logs] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bot logs' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        // This endpoint is for internal use to log bot detections
        // In production, you might want to add authentication here too
        
        const body = await request.json();
        const { ip, userAgent, confidence, reason, blocked, path } = body;

        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: ip || 'unknown',
            userAgent: userAgent || 'unknown',
            confidence: confidence || 0,
            reason: reason || 'unknown',
            blocked: blocked || false,
            path: path || 'unknown'
        };

        botLogs.push(logEntry);

        // Keep only last 1000 logs to prevent memory issues
        if (botLogs.length > 1000) {
            botLogs.splice(0, botLogs.length - 1000);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Bot Logs] Error logging:', error);
        return NextResponse.json(
            { error: 'Failed to log bot detection' },
            { status: 500 }
        );
    }
}

function getTopUserAgents(logs: typeof botLogs): Array<{ userAgent: string; count: number }> {
    const counts = new Map<string, number>();
    
    logs.forEach(log => {
        const ua = log.userAgent.substring(0, 100); // Truncate for display
        counts.set(ua, (counts.get(ua) || 0) + 1);
    });
    
    return Array.from(counts.entries())
        .map(([userAgent, count]) => ({ userAgent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}

function getTopIPs(logs: typeof botLogs): Array<{ ip: string; count: number }> {
    const counts = new Map<string, number>();
    
    logs.forEach(log => {
        counts.set(log.ip, (counts.get(log.ip) || 0) + 1);
    });
    
    return Array.from(counts.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
}