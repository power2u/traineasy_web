/**
 * Server-side Authentication and Authorization Utilities
 * Provides secure server-side validation of user roles and permissions
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Get authenticated user with server-side validation
 */
export async function getAuthenticatedUser() {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
        return null;
    }
    
    return session.user;
}

/**
 * Validate user role against database (more secure than JWT token)
 */
export async function validateUserRole(userId: string): Promise<string | null> {
    try {
        const user = await prisma.userPreference.findUnique({
            where: { id: userId },
            select: { 
                role: true, 
                bannedUntil: true,
                emailVerified: true 
            }
        });
        
        if (!user) {
            return null;
        }
        
        // Check if user is banned
        if (user.bannedUntil && user.bannedUntil > new Date()) {
            return null;
        }
        
        // Check email verification if required
        if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.emailVerified) {
            return null;
        }
        
        return user.role;
    } catch (error) {
        console.error('[Auth] Error validating user role:', error);
        return null;
    }
}

/**
 * Check if user is super admin with database validation
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
    const role = await validateUserRole(userId);
    return role === 'super_admin';
}

/**
 * Require authentication middleware for API routes
 */
export async function requireAuth(): Promise<{ user: any; error?: NextResponse }> {
    const user = await getAuthenticatedUser();
    
    if (!user) {
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        };
    }
    
    return { user };
}

/**
 * Require admin role middleware for API routes
 */
export async function requireAdmin(): Promise<{ user: any; error?: NextResponse }> {
    const { user, error } = await requireAuth();
    
    if (error) {
        return { user: null, error };
    }
    
    // Validate role against database (more secure)
    const isAdmin = await isSuperAdmin(user.id);
    
    if (!isAdmin) {
        console.warn(`[Security] Non-admin user attempted admin action: ${user.email} (${user.id})`);
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        };
    }
    
    return { user };
}

/**
 * Validate user owns resource or is admin
 */
export async function validateResourceAccess(
    resourceUserId: string,
    currentUserId: string
): Promise<boolean> {
    // User can access their own resources
    if (resourceUserId === currentUserId) {
        return true;
    }
    
    // Admin can access any resource
    const isAdmin = await isSuperAdmin(currentUserId);
    return isAdmin;
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
    event: string,
    userId?: string,
    details?: Record<string, any>
) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        userId,
        details,
        ip: details?.ip || 'unknown'
    };
    
    console.log(`[Security Event] ${JSON.stringify(logEntry)}`);
    
    // In production, you might want to send this to a security monitoring service
    // or store in a dedicated security log table
}

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOperationAttempts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitSensitiveOperation(
    identifier: string,
    maxAttempts: number = 3,
    windowMs: number = 60 * 60 * 1000 // 1 hour
): boolean {
    const now = Date.now();
    const existing = sensitiveOperationAttempts.get(identifier);
    
    if (!existing || now > existing.resetTime) {
        sensitiveOperationAttempts.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return true;
    }
    
    if (existing.count >= maxAttempts) {
        return false;
    }
    
    existing.count++;
    return true;
}

/**
 * Validate request origin for CSRF protection
 */
export function validateRequestOrigin(request: Request): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    const allowedOrigins = [
        process.env.NEXTAUTH_URL,
        `https://${host}`,
        `http://${host}` // Only for development
    ].filter(Boolean);
    
    // Check origin header
    if (origin && !allowedOrigins.includes(origin)) {
        return false;
    }
    
    // Check referer header as fallback
    if (!origin && referer) {
        const refererOrigin = new URL(referer).origin;
        if (!allowedOrigins.includes(refererOrigin)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Enhanced admin validation with additional security checks
 */
export async function requireAdminWithSecurityChecks(
    request: Request
): Promise<{ user: any; error?: NextResponse }> {
    // 1. Basic admin validation
    const { user, error } = await requireAdmin();
    if (error) return { user: null, error };
    
    // 2. Validate request origin (CSRF protection)
    if (!validateRequestOrigin(request)) {
        logSecurityEvent('csrf_attempt', user.id, {
            origin: request.headers.get('origin'),
            referer: request.headers.get('referer')
        });
        
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Invalid request origin' },
                { status: 403 }
            )
        };
    }
    
    // 3. Rate limiting for admin operations
    const rateLimitKey = `admin_ops_${user.id}`;
    if (!rateLimitSensitiveOperation(rateLimitKey, 20, 60 * 60 * 1000)) { // 20 ops per hour
        logSecurityEvent('admin_rate_limit_exceeded', user.id);
        
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Too many admin operations. Please try again later.' },
                { status: 429 }
            )
        };
    }
    
    return { user };
}