import { Spinner } from '@heroui/react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Spinner size="lg" className="w-12 h-12" />
    </div>
  );
}
