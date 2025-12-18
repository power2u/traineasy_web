<<<<<<< HEAD
/**
 * Lazy-loaded components for better performance
 * These components are loaded only when needed
 */

import dynamic from 'next/dynamic';
import { Spinner } from '@heroui/react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Spinner size="lg" />
  </div>
);

// Weight components (heavy due to charts)
export const WeightChart = dynamic(
  () => import('@/components/weight/weight-chart').then(mod => ({ default: mod.WeightChart })),
  {
    loading: LoadingFallback,
    ssr: false, // Charts don't need SSR
  }
);

export const WeightHistory = dynamic(
  () => import('@/components/weight/weight-history').then(mod => ({ default: mod.WeightHistory })),
  {
    loading: LoadingFallback,
  }
);

// Water components
export const WaterHistory = dynamic(
  () => import('@/components/water/water-history').then(mod => ({ default: mod.WaterHistory })),
  {
    loading: LoadingFallback,
  }
);

// Admin components (only loaded for admins)
export const AdminUserTable = dynamic(
  () => import('@/app/admin/users/page'),
  {
    loading: LoadingFallback,
  }
);

export const AdminPackagesTable = dynamic(
  () => import('@/app/admin/packages/page'),
  {
    loading: LoadingFallback,
  }
);
=======
/**
 * Lazy-loaded components for better performance
 * These components are loaded only when needed
 */

import dynamic from 'next/dynamic';
import { Spinner } from '@heroui/react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Spinner size="lg" />
  </div>
);

// Weight components (heavy due to charts)
export const WeightChart = dynamic(
  () => import('@/components/weight/weight-chart').then(mod => ({ default: mod.WeightChart })),
  {
    loading: LoadingFallback,
    ssr: false, // Charts don't need SSR
  }
);

export const WeightHistory = dynamic(
  () => import('@/components/weight/weight-history').then(mod => ({ default: mod.WeightHistory })),
  {
    loading: LoadingFallback,
  }
);

// Water components
export const WaterHistory = dynamic(
  () => import('@/components/water/water-history').then(mod => ({ default: mod.WaterHistory })),
  {
    loading: LoadingFallback,
  }
);

// Admin components (only loaded for admins)
export const AdminUserTable = dynamic(
  () => import('@/app/admin/users/page'),
  {
    loading: LoadingFallback,
  }
);

export const AdminPackagesTable = dynamic(
  () => import('@/app/admin/packages/page'),
  {
    loading: LoadingFallback,
  }
);
>>>>>>> main
