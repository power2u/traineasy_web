import { Card } from '@heroui/react';

export function CardSkeleton() {
  return (
    <Card className="p-3 md:p-6 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
      <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-2/3"></div>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-800 rounded animate-pulse"></div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="p-3 md:p-6">
      <div className="h-4 bg-gray-700 rounded w-1/4 mb-4 animate-pulse"></div>
      <div className="h-64 bg-gray-800 rounded animate-pulse"></div>
    </Card>
  );
}
