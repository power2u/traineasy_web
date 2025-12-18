<<<<<<< HEAD
import { CardSkeleton } from '@/components/ui/loading-skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse mb-6"></div>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      <CardSkeleton />
    </div>
  );
}
=======
import { CardSkeleton } from '@/components/ui/loading-skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse mb-6"></div>
      
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      
      <CardSkeleton />
    </div>
  );
}
>>>>>>> main
