'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email/smtp';
import { render } from '@react-email/render';
import PasswordResetEmail from '@/lib/email/templates/password-reset';


const TOKEN_EXPIRATION_HOURS = 24;

/**
 * Return type for password reset request
 */
type PasswordResetResponse = {
    success: boolean;
    message?: string;
    error?: string;
    token?: string;
};

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Request a password reset for the given email
 * Returns success even if email doesn't exist (security best practice)
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
        if (!email || !email.includes('@')) {
            return {
                success: false,
                error: 'Please provide a valid email address'
            };
        }

        const adminClient = createAdminClient();

        // Check if user exists
        const { data: user, error: userError } = await adminClient
            .from('user_preferences')
            .select('id, email')
            .eq('email', email)
            .single();

        // For security, always return success even if user doesn't exist
        // This prevents email enumeration attacks
        if (userError || !user) {
            console.log(`[Password Reset] User not found for email: ${email}`);
            return {
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link shortly.'
            };
        }

        // Generate token
        const token = generateResetToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRATION_HOURS);

        // Invalidate any existing tokens for this user
        await adminClient
            .from('password_reset_tokens')
            .delete()
            .eq('user_id', user.id)
            .is('used_at', null);

        // Store new token
        const { error: tokenError } = await adminClient
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token,
                expires_at: expiresAt.toISOString(),
            });

        if (tokenError) {
            console.error('[Password Reset] Error creating token:', tokenError);
            return {
                success: false,
                error: 'Failed to generate reset token. Please try again.'
            };
        }

        // Send password reset email
        // Ensure NEXTAUTH_URL is defined, fallback to localhost in dev if invalid
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;

        try {
            const emailHtml = await render(
                PasswordResetEmail({
                    resetLink,
                    userEmail: email,
                    expirationHours: TOKEN_EXPIRATION_HOURS,
                    baseUrl,
                    supportEmail: process.env.SMTP_FROM || 'support@traineasy.com',
                })
            );


            const emailResult = await sendEmail({
                to: email,
                subject: 'Reset Your TrainEasy Password',
                html: emailHtml,
                text: `Reset your password by clicking this link: ${resetLink}\n\nThis link will expire in ${TOKEN_EXPIRATION_HOURS} hours.`,
            });

            if (!emailResult.success) {
                console.error('[Password Reset] Failed to send email:', emailResult.error);
                // Don't fail the request, just log the error
                // The token is still valid and can be used if the user has it
            } else {
                console.log(`[Password Reset] Email sent successfully to ${email}`);
            }
        } catch (emailError) {
            console.error('[Password Reset] Email sending error:', emailError);
            // Continue anyway - token is still valid
        }

        // In development, also log the token for testing
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Password Reset] Token for ${email}: ${token}`);
            console.log(`[Password Reset] Reset link: ${resetLink}`);
        }


        return {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link shortly.',
            // TEMPORARY: Include token in response for testing (REMOVE IN PRODUCTION)
            ...(process.env.NODE_ENV === 'development' && { token })
        };
    } catch (error: any) {
        console.error('[Password Reset] Unexpected error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.'
        };
    }
}

/**
 * Validate a reset token without consuming it
 */
export async function validateResetToken(token: string) {
    try {
        if (!token) {
            return { valid: false, error: 'Token is required' };
        }

        const adminClient = createAdminClient();

        const { data: resetToken, error } = await adminClient
            .from('password_reset_tokens')
            .select('id, user_id, expires_at, used_at')
            .eq('token', token)
            .single();

        if (error || !resetToken) {
            return { valid: false, error: 'Invalid or expired token' };
        }

        // Check if token has been used
        if (resetToken.used_at) {
            return { valid: false, error: 'This reset link has already been used' };
        }

        // Check if token has expired
        const expiresAt = new Date(resetToken.expires_at);
        if (expiresAt < new Date()) {
            return { valid: false, error: 'This reset link has expired' };
        }

        return { valid: true, userId: resetToken.user_id };
    } catch (error: any) {
        console.error('[Password Reset] Validation error:', error);
        return { valid: false, error: 'Failed to validate token' };
    }
}

/**
 * Reset password using a valid token
 */
export async function resetPasswordWithToken(token: string, newPassword: string) {
    try {
        if (!token || !newPassword) {
            return {
                success: false,
                error: 'Token and new password are required'
            };
        }

        if (newPassword.length < 8) {
            return {
                success: false,
                error: 'Password must be at least 8 characters long'
            };
        }

        // Validate token first
        const validation = await validateResetToken(token);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        const adminClient = createAdminClient();

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user's password
        const { error: updateError } = await adminClient
            .from('user_preferences')
            .update({
                password_hash: hashedPassword,
                password_change_required: false,
            })
            .eq('id', validation.userId);

        if (updateError) {
            console.error('[Password Reset] Error updating password:', updateError);
            return {
                success: false,
                error: 'Failed to update password. Please try again.'
            };
        }

        // Mark token as used
        await adminClient
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', token);

        return {
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        };
    } catch (error: any) {
        console.error('[Password Reset] Reset error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.'
        };
    }
}

/**
 * Cleanup expired tokens (called by cron job)
 */
export async function cleanupExpiredTokens() {
    try {
        const adminClient = createAdminClient();

        const { error } = await adminClient
            .from('password_reset_tokens')
            .delete()
            .lt('expires_at', new Date().toISOString());

        if (error) {
            console.error('[Password Reset] Cleanup error:', error);
            return { success: false, error: error.message };
        }

        console.log('[Password Reset] Expired tokens cleaned up successfully');
        return { success: true };
    } catch (error: any) {
        console.error('[Password Reset] Cleanup error:', error);
        return { success: false, error: error.message };
    }
}
