'use client';

import { useState } from 'react';
import { Button, TextField, Label, Input, Card, Text } from '@heroui/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { requestPasswordReset } from '@/app/actions/password-reset';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const result = await requestPasswordReset(email);

            if (result.success) {
                setSubmitted(true);
                setMessage({
                    type: 'success',
                    text: result.message || 'Password reset link sent! Check your email.',
                });

                // In development, show the token
                if (process.env.NODE_ENV === 'development' && 'token' in result) {
                    console.log('Reset token:', result.token);
                    console.log('Reset link:', `${window.location.origin}/auth/reset-password?token=${result.token}`);
                }
            } else {
                setMessage({
                    type: 'error',
                    text: result.error || 'Failed to send reset link. Please try again.',
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

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            {/* Theme Toggle - Top Right */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md p-8">
                <div className="mb-6 text-center">
                    <img src="/logo.png" alt="Fitness Tracker" className="h-16 w-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-foreground">Forgot Password</h1>
                    <Text className="mt-2 text-default-500">
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TextField value={email} onChange={setEmail} isRequired isDisabled={loading}>
                            <Label>Email</Label>
                            <Input type="email" placeholder="Enter your email" />
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
                            isDisabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>

                        <div className="text-center">
                            <a href="/auth/login" className="text-sm text-blue-500 hover:text-blue-600 hover:underline">
                                Back to Login
                            </a>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-lg bg-green-500/10 p-4 text-sm text-green-500 border border-green-500/20">
                            <div className="font-semibold mb-2">✓ Email Sent!</div>
                            <div className="mb-3">{message?.text}</div>
                            <div className="text-xs text-default-500">
                                If you don't receive an email within a few minutes, please check your spam folder.
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <div>
                                <a href="/auth/login" className="text-sm text-blue-500 hover:text-blue-600 hover:underline">
                                    Back to Login
                                </a>
                            </div>
                            <div>
                                <button
                                    onClick={() => {
                                        setSubmitted(false);
                                        setMessage(null);
                                        setEmail('');
                                    }}
                                    className="text-sm text-default-500 hover:text-default-700 hover:underline"
                                >
                                    Send another reset link
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
