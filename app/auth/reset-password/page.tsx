'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, TextField, Label, Input, Card, Text } from '@heroui/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { validateResetToken, resetPasswordWithToken } from '@/app/actions/password-reset';

import { Suspense } from 'react';

function ResetPasswordContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState<string | null>(null);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setTokenError('No reset token provided');
                setValidating(false);
                return;
            }

            const result = await validateResetToken(token);

            if (result.valid) {
                setTokenValid(true);
            } else {
                setTokenError(result.error || 'Invalid token');
            }

            setValidating(false);
        };

        checkToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (newPassword.length < 8) {
            setMessage({
                type: 'error',
                text: 'Password must be at least 8 characters long',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({
                type: 'error',
                text: 'Passwords do not match',
            });
            return;
        }

        setLoading(true);

        try {
            const result = await resetPasswordWithToken(token!, newPassword);

            if (result.success) {
                setResetSuccess(true);
                setMessage({
                    type: 'success',
                    text: result.message || 'Password reset successfully!',
                });

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login');
                }, 3000);
            } else {
                setMessage({
                    type: 'error',
                    text: result.error || 'Failed to reset password. Please try again.',
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    // Password strength indicator
    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 8) return { strength: 1, label: 'Too short', color: 'text-red-500' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { strength: 2, label: 'Weak', color: 'text-orange-500' };
        if (strength <= 3) return { strength: 3, label: 'Medium', color: 'text-yellow-500' };
        return { strength: 4, label: 'Strong', color: 'text-green-500' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            {/* Theme Toggle - Top Right */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md p-8">
                <div className="mb-6 text-center">
                    <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
                    <Text className="mt-2 text-default-500">
                        Enter your new password below
                    </Text>
                </div>

                {validating ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <Text className="mt-4 text-default-500">Validating reset link...</Text>
                    </div>
                ) : !tokenValid ? (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20">
                            <div className="font-semibold mb-2">⚠️ Invalid Reset Link</div>
                            <div>{tokenError}</div>
                        </div>

                        <div className="text-center space-y-2">
                            <div>
                                <a href="/auth/forgot-password" className="text-sm text-blue-500 hover:text-blue-600 hover:underline">
                                    Request a new reset link
                                </a>
                            </div>
                            <div>
                                <a href="/auth/login" className="text-sm text-default-500 hover:text-default-700 hover:underline">
                                    Back to Login
                                </a>
                            </div>
                        </div>
                    </div>
                ) : resetSuccess ? (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-500 border border-green-500/20">
                            <div className="font-semibold mb-2">✓ Password Reset Successfully!</div>
                            <div className="mb-3">{message?.text}</div>
                            <div className="text-xs text-default-500">
                                Redirecting to login page...
                            </div>
                        </div>

                        <div className="text-center">
                            <a href="/auth/login" className="text-sm text-blue-500 hover:text-blue-600 hover:underline">
                                Go to Login Now
                            </a>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TextField value={newPassword} onChange={setNewPassword} isRequired isDisabled={loading}>
                            <Label>New Password</Label>
                            <Input type="password" placeholder="Enter new password (min 8 characters)" />
                        </TextField>

                        {newPassword && (
                            <div className="text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-default-500">Strength:</span>
                                    <span className={`font-semibold ${passwordStrength.color}`}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                                <div className="mt-1 h-1 w-full bg-default-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                                            passwordStrength.strength === 2 ? 'bg-orange-500 w-2/4' :
                                                passwordStrength.strength === 3 ? 'bg-yellow-500 w-3/4' :
                                                    'bg-green-500 w-full'
                                            }`}
                                    />
                                </div>
                            </div>
                        )}

                        <TextField value={confirmPassword} onChange={setConfirmPassword} isRequired isDisabled={loading}>
                            <Label>Confirm Password</Label>
                            <Input type="password" placeholder="Confirm new password" />
                        </TextField>

                        {message && (
                            <div
                                className={`rounded-lg p-3 text-sm border ${message.type === 'error'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                                    }`}
                            >
                                <div className="font-semibold mb-1">
                                    {message.type === 'error' ? '⚠️ Error' : '✓ Success'}
                                </div>
                                <div>{message.text}</div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                            isDisabled={loading || !newPassword || !confirmPassword}
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </Button>

                        <div className="text-center">
                            <a href="/auth/login" className="text-sm text-default-500 hover:text-default-700 hover:underline">
                                Back to Login
                            </a>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <Text className="mt-4 text-default-500">Loading...</Text>
                </div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
