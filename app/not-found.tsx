'use client';

import Link from 'next/link';
import { Button } from '@heroui/react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button variant="primary">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}