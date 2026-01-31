import { Calendar, AlertCircle } from 'lucide-react';
import { getActiveMembership } from '@/lib/data/cached-queries';

export async function MembershipSection({ userId, isAdmin }: { userId: string, isAdmin: boolean }) {
    if (isAdmin) {
        return (
            <div className="mt-2 flex items-center gap-2">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 md:text-base">
                        Administrator Account
                    </span>
                </div>
            </div>
        );
    }

    const membershipResult = await getActiveMembership(userId);
    const membership = membershipResult.success ? membershipResult.membership : null;

    return (
        <>
            {membership && !membership.is_expired ? (
                <div className="mt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 md:h-5 md:w-5" />
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 md:text-base">
                        Day {membership.days_elapsed + 1} of {membership.total_days}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                        • {membership.package_name} • {membership.days_remaining} days remaining
                    </span>
                </div>
            ) : membership && membership.is_expired ? (
                <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 md:h-5 md:w-5" />
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400 md:text-base">
                        Membership Expired
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                        • Please contact admin to renew
                    </span>
                </div>
            ) : (
                <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 md:h-5 md:w-5" />
                    <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 md:text-base">
                        No Active Membership
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                        • Please contact admin to activate your account
                    </span>
                </div>
            )}

            {/* Membership Expired Warning */}
            {membership && membership.is_expired && (
                <div className="mb-4 mt-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 md:p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 md:h-6 md:w-6" />
                        <div>
                            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 md:text-base">
                                Your membership has expired
                            </h3>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                                Your {membership.package_name} package ended on {new Date(membership.end_date).toLocaleDateString()}.
                                Please contact your administrator to renew your membership and continue tracking your fitness goals.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* No Membership Warning */}
            {!membership && (
                <div className="mb-4 mt-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3 md:p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400 md:h-6 md:w-6" />
                        <div>
                            <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 md:text-base">
                                No active membership
                            </h3>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                                You don't have an active package assigned. Please contact your administrator to activate a membership package.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
