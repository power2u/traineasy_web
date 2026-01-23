
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { updatePasswordAndResetFlag } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

export function ForcePasswordChange() {
    const { data: session, update } = useSession();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Check if password change is required
    const isRequired = session?.user?.password_change_required;

    const handleSubmit = async () => {
        setError('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const result = await updatePasswordAndResetFlag(newPassword);

            if (result.success) {
                await update({
                    ...session,
                    user: {
                        ...session?.user,
                        password_change_required: false
                    }
                });

                alert("Password updated successfully!");
                router.refresh();
            } else {
                setError(result.error || 'Failed to update password');
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isRequired) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm" />

            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                <div className="bg-background border border-divider rounded-2xl p-6 max-w-md w-full shadow-2xl">
                    <div className="flex flex-col gap-2 mb-6 text-center">
                        <h2 className="text-2xl font-bold text-danger">⚠️ Security Update Required</h2>
                        <p className="text-sm text-default-500">
                            Your account has been flagged for a mandatory password update.
                            Please set a new secure password to continue using the application.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                className="w-full px-3 py-2 rounded-lg bg-default-100 border border-default-200 focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                placeholder="Enter new password"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                className={`w-full px-3 py-2 rounded-lg bg-default-100 border focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${error ? 'border-danger focus:ring-danger' : 'border-default-200'}`}
                                placeholder="Confirm new password"
                                required
                            />
                            {error && <p className="text-xs text-danger">{error}</p>}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>

                        <button
                            onClick={() => signOut({ callbackUrl: '/auth/login' })}
                            disabled={loading}
                            className="w-full py-2 px-4 rounded-lg bg-transparent text-danger hover:bg-danger/10 font-medium transition-colors"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
