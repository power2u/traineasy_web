'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Card, Text } from '@heroui/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { validateVerificationToken, verifyEmailWithToken } from '@/app/actions/email-verification';
import { Suspense } from 'react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [validating, setValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [verificationSuccess, setVerificationSuccess] = useState(false);

    // Validate token on mount
    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setTokenError('No verification token provided');
                setValidating(false);
                return;
            }

            const result = await validateVerificationToken(token);

            if (result.success) {
                setTokenValid(true);
                // Auto-verify if token is valid
                handleVerification();
            } else {
                setTokenError(result.error || 'Invalid verification token');
            }

            setValidating(false);
        };

        checkToken();
    }, [token]);

    const handleVerification = async () => {
        if (!token) return;

        setVerifying(true);
        setMessage(null);

        try {
            const result = await verifyEmailWithToken(token);

            if (result.success) {
                setVerificationSuccess(true);
                setMessage({
                    type: 'success',
                    text: result.message || 'Email verified successfully!',
                });

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/auth/login?verified=true');
                }, 3000);
            } else {
                setMessage({
                    type: 'error',
                    text: result.error || 'Failed to verify email. Please try again.',
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setVerifying(false);
        }
    };

    if (validating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
                <Card className="w-full max-w-md p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <Text className="text-lg font-semibold">Validating verification token...</Text>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Email Verification
                    </h1>
                </div>

                {tokenError ? (
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">❌</div>
                        <Text className="text-red-600 mb-4">{tokenError}</Text>
                        <Button
                            variant="primary"
                            onClick={() => router.push('/auth/login')}
                            className="w-full"
                        >
                            Go to Login
                        </Button>
                    </div>
                ) : verificationSuccess ? (
                    <div className="text-center">
                        <div className="text-green-500 text-6xl mb-4">✅</div>
                        <Text className="text-green-600 mb-4">
                            Your email has been verified successfully!
                        </Text>
                        <Text className="text-gray-600 mb-4">
                            Redirecting to login page...
                        </Text>
                        <Button
                            variant="primary"
                            onClick={() => router.push('/auth/login?verified=true')}
                            className="w-full"
                        >
                            Continue to Login
                        </Button>
                    </div>
                ) : verifying ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <Text className="text-lg font-semibold">Verifying your email...</Text>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="text-blue-500 text-6xl mb-4">📧</div>
                        <Text className="text-gray-600 mb-4">
                            Click the button below to verify your email address.
                        </Text>
                        <Button
                            variant="primary"
                            onClick={handleVerification}
                            className="w-full"
                            isDisabled={verifying}
                        >
                            Verify Email
                        </Button>
                    </div>
                )}

                {message && (
                    <div className={`mt-4 p-3 rounded-md ${
                        message.type === 'success' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        <Text className="text-sm">{message.text}</Text>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}