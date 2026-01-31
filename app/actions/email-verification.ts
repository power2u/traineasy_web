'use server';

import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/smtp';
import { render } from '@react-email/render';
import EmailVerification from '@/lib/email/templates/email-verification';

const TOKEN_EXPIRATION_HOURS = 24;

/**
 * Return type for email verification operations
 */
type EmailVerificationResponse = {
    success: boolean;
    message?: string;
    error?: string;
};

/**
 * Generate a secure random token for email verification
 */
function generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Send email verification to user
 */
export async function sendEmailVerification(userId: string, email: string): Promise<EmailVerificationResponse> {
    try {
        // Generate token
        const token = generateVerificationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

        // Invalidate any existing tokens for this user
        await prisma.emailVerificationToken.deleteMany({
            where: {
                userId: userId,
                usedAt: null
            }
        });

        // Store new token
        await prisma.emailVerificationToken.create({
            data: {
                userId,
                token,
                expiresAt,
            }
        });

        // Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verificationLink = `${baseUrl}/auth/verify-email?token=${token}`;

        const emailHtml = await render(
            EmailVerification({
                verificationLink,
                userEmail: email,
                baseUrl,
                supportEmail: process.env.SMTP_FROM || 'support@traineasy.com',
            })
        );

        const emailResult = await sendEmail({
            to: email,
            subject: 'Verify Your TrainEasy Account',
            html: emailHtml,
        });

        if (!emailResult.success) {
            console.error('[Email Verification] Failed to send email:', emailResult.error);
            return {
                success: false,
                error: 'Failed to send verification email. Please try again.'
            };
        }

        return {
            success: true,
            message: 'Verification email sent successfully'
        };

    } catch (error) {
        console.error('[Email Verification] Error:', error);
        return {
            success: false,
            error: 'Failed to send verification email'
        };
    }
}

/**
 * Validate email verification token
 */
export async function validateVerificationToken(token: string): Promise<EmailVerificationResponse & { userId?: string }> {
    try {
        if (!token) {
            return {
                success: false,
                error: 'No verification token provided'
            };
        }

        // Find the token
        const verificationToken = await prisma.emailVerificationToken.findUnique({
            where: { token },
            include: {
                user: {
                    select: { id: true, email: true, emailVerified: true }
                }
            }
        });

        if (!verificationToken) {
            return {
                success: false,
                error: 'Invalid verification token'
            };
        }

        // Check if token is expired
        if (verificationToken.expiresAt < new Date()) {
            return {
                success: false,
                error: 'Verification token has expired'
            };
        }

        // Check if token was already used
        if (verificationToken.usedAt) {
            return {
                success: false,
                error: 'Verification token has already been used'
            };
        }

        return {
            success: true,
            userId: verificationToken.userId
        };

    } catch (error) {
        console.error('[Email Verification] Validation error:', error);
        return {
            success: false,
            error: 'Failed to validate verification token'
        };
    }
}

/**
 * Verify user email with token
 */
export async function verifyEmailWithToken(token: string): Promise<EmailVerificationResponse> {
    try {
        // Validate token first
        const validation = await validateVerificationToken(token);
        
        if (!validation.success || !validation.userId) {
            return validation;
        }

        // Mark token as used and verify user email
        await prisma.$transaction([
            prisma.emailVerificationToken.update({
                where: { token },
                data: { usedAt: new Date() }
            }),
            prisma.userPreference.update({
                where: { id: validation.userId },
                data: { 
                    emailVerified: true,
                    emailVerifiedAt: new Date()
                }
            })
        ]);

        return {
            success: true,
            message: 'Email verified successfully!'
        };

    } catch (error) {
        console.error('[Email Verification] Verification error:', error);
        return {
            success: false,
            error: 'Failed to verify email'
        };
    }
}

/**
 * Cleanup expired verification tokens
 */
export async function cleanupExpiredVerificationTokens(): Promise<EmailVerificationResponse> {
    try {
        const result = await prisma.emailVerificationToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });

        console.log(`[Email Verification] Cleaned up ${result.count} expired tokens`);

        return {
            success: true,
            message: `Cleaned up ${result.count} expired verification tokens`
        };

    } catch (error) {
        console.error('[Email Verification] Cleanup error:', error);
        return {
            success: false,
            error: 'Failed to cleanup expired tokens'
        };
    }
}