import { Card, Skeleton } from '@heroui/react';

export function CardSkeleton() {
    return (
        <Card className="p-3 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-10 w-16 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
        </Card>
    );
}

export function QuickStatsSkeleton() {
    return (
        <Card className="mt-3 p-3 md:mt-6 md:p-6">
            <Skeleton className="mb-4 h-6 w-32 rounded-lg" />
            <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20 rounded-lg" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                    </div>
                ))}
            </div>
        </Card>
    );
}

export function MembershipSkeleton() {
    return (
        <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-48 rounded-lg" />
        </div>
    );
}
