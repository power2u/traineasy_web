import { Card, Text } from '@heroui/react';
import { Calendar, AlertCircle } from 'lucide-react';
import { getActiveMembership } from '@/lib/data/cached-queries';

export async function MembershipSection({ userId, isAdmin }: { userId: string, isAdmin: boolean }) {
    if (isAdmin) {
        return (
            <div className="mt-2 flex items-center gap-2">
                <div className="rounded-full bg-primary/20 px-3 py-1">
                    <Text className="text-sm font-semibold text-primary md:text-base">
                        Administrator Account
                    </Text>
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
                    <Calendar className="h-4 w-4 text-primary md:h-5 md:w-5" />
                    <Text className="text-sm font-semibold text-primary md:text-base">
                        Day {membership.days_elapsed + 1} of {membership.total_days}
                    </Text>
                    <Text className="text-xs text-muted-foreground md:text-sm">
                        • {membership.package_name} • {membership.days_remaining} days remaining
                    </Text>
                </div>
            ) : membership && membership.is_expired ? (
                <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive md:h-5 md:w-5" />
                    <Text className="text-sm font-semibold text-destructive md:text-base">
                        Membership Expired
                    </Text>
                    <Text className="text-xs text-muted-foreground md:text-sm">
                        • Please contact admin to renew
                    </Text>
                </div>
            ) : (
                <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning md:h-5 md:w-5" />
                    <Text className="text-sm font-semibold text-warning md:text-base">
                        No Active Membership
                    </Text>
                    <Text className="text-xs text-muted-foreground md:text-sm">
                        • Please contact admin to activate your account
                    </Text>
                </div>
            )}

            {/* Membership Expired Warning */}
            {membership && membership.is_expired && (
                <Card className="mb-4 mt-4 border-destructive/50 bg-destructive/10 p-3 md:p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-destructive md:h-6 md:w-6" />
                        <div>
                            <h3 className="text-sm font-semibold text-destructive md:text-base">
                                Your membership has expired
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                                Your {membership.package_name} package ended on {new Date(membership.end_date).toLocaleDateString()}.
                                Please contact your administrator to renew your membership and continue tracking your fitness goals.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* No Membership Warning */}
            {!membership && (
                <Card className="mb-4 mt-4 border-warning/50 bg-warning/10 p-3 md:p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-warning md:h-6 md:w-6" />
                        <div>
                            <h3 className="text-sm font-semibold text-warning md:text-base">
                                No active membership
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                                You don't have an active package assigned. Please contact your administrator to activate a membership package.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </>
    );
}
