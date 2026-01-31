export interface UserMembership {
    id: string;
    package_name: string;
    days_remaining: number;
    days_elapsed: number;
    total_days: number;
    is_expired: boolean;
    status: string;
    start_date: string;
    end_date: string;
    notes?: string;
}

// Helper to calculate membership details
export function calculateMembershipDetails(membership: any): UserMembership {
    const startDate = new Date(membership.startDate);
    const endDate = new Date(membership.endDate);
    const today = new Date();

    // Calculate remaining days
    const timeDiff = endDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Calculate total duration and elapsed days
    const totalDiff = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(totalDiff / (1000 * 3600 * 24));

    const elapsedDiff = today.getTime() - startDate.getTime();
    const daysElapsed = Math.floor(elapsedDiff / (1000 * 3600 * 24));

    const isExpired = daysRemaining < 0; // || membership.status !== 'active';

    return {
        id: membership.id,
        package_name: membership.package?.name || 'Unknown Package',
        days_remaining: daysRemaining > 0 ? daysRemaining : 0,
        days_elapsed: daysElapsed > 0 ? daysElapsed : 0,
        total_days: totalDays > 0 ? totalDays : 0,
        is_expired: isExpired,
        status: membership.status,
        start_date: startDate.toLocaleDateString(),
        end_date: endDate.toLocaleDateString(),
        notes: membership.notes,
    };
}
