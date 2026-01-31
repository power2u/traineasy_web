export function CardSkeleton() {
    return (
        <div className="p-3 md:p-6 space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="h-6 w-24 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="space-y-2">
                <div className="h-10 w-16 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
            <div className="h-10 w-full bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
    );
}

export function QuickStatsSkeleton() {
    return (
        <div className="mt-3 p-3 md:mt-6 md:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="mb-4 h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="grid gap-3 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
                        <div className="h-8 w-16 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function MembershipSkeleton() {
    return (
        <div className="mt-2 flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-5 w-48 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
    );
}
