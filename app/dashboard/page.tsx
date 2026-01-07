'use client';

import { useAuthUser, useAuthLoading } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Button, Card, Text, Spinner } from '@heroui/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { weightService } from '@/lib/services/weight-service';
import { getTodayWaterCount, getWaterTarget } from '@/app/actions/water';
import { getTodayMeals } from '@/app/actions/meals';
import { getActiveMembership } from '@/app/actions/memberships';
import { Droplet, Utensils, Scale, Calendar, AlertCircle } from 'lucide-react';

import { EnableNotificationsButton } from '@/components/settings/enable-notifications-button';

export default function DashboardPage() {
  const user = useAuthUser();
  const loading = useAuthLoading();
  const router = useRouter();

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
    return role === 'super_admin';
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Parallel data fetching with React Query
  // Skip membership check for admins
  const { data: membership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ['membership', 'active', user?.id],
    queryFn: async () => {
      const result = await getActiveMembership(user!.id);
      return result.success ? result.membership : null;
    },
    enabled: !!user && !isAdmin,
  });

  const { data: latestWeight, isLoading: isLoadingWeight } = useQuery({
    queryKey: ['weight', 'latest', user?.id],
    queryFn: () => weightService.getLatestLog(user!.id),
    enabled: !!user,
  });

  const { data: waterCount = 0, isLoading: isLoadingWater } = useQuery({
    queryKey: ['water', 'today-count', user?.id],
    queryFn: async () => {
      const result = await getTodayWaterCount(user!.id);
      return result.success ? result.count : 0;
    },
    enabled: !!user,
  });

  const { data: waterTarget = 14, isLoading: isLoadingWaterTarget } = useQuery({
    queryKey: ['water', 'target', user?.id],
    queryFn: async () => {
      const result = await getWaterTarget(user!.id);
      return result.success ? result.target : 14;
    },
    enabled: !!user,
  });

  const { data: mealsCompleted = 0, isLoading: isLoadingMeals } = useQuery({
    queryKey: ['meals', 'today-completed', user?.id],
    queryFn: async () => {
      const result = await getTodayMeals(user!.id);
      if (result.success && result.meals) {
        const meals = result.meals;
        return (
          (meals.breakfast_completed ? 1 : 0) +
          (meals.snack1_completed ? 1 : 0) +
          (meals.lunch_completed ? 1 : 0) +
          (meals.snack2_completed ? 1 : 0) +
          (meals.dinner_completed ? 1 : 0)
        );
      }
      return 0;
    },
    enabled: !!user,
  });

  // Check if any data is still loading
  const isAnyDataLoading = isLoadingWeight || isLoadingWater || isLoadingWaterTarget || isLoadingMeals;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold md:text-3xl">
          Welcome back, {user.displayName || user.email?.split('@')[0]}!
        </h2>
        {/* Show membership info only for non-admin users */}
        {!isAdmin && (
          <>
            {isLoadingMembership ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 w-24 bg-default-200 rounded animate-pulse"></div>
              </div>
            ) : membership && !membership.is_expired ? (
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
          </>
        )}
        {/* Show admin badge for admin users */}
        {isAdmin && (
          <div className="mt-2 flex items-center gap-2">
            <div className="rounded-full bg-primary/20 px-3 py-1">
              <Text className="text-sm font-semibold text-primary md:text-base">
                Administrator Account
              </Text>
            </div>
          </div>
        )}
      </div>

      <EnableNotificationsButton />

      {/* Membership Expired Warning - Only for non-admin users */}
      {!isAdmin && membership && membership.is_expired && (
        <Card className="mb-4 border-destructive/50 bg-destructive/10 p-3 md:p-4">
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

      {/* No Membership Warning - Only for non-admin users */}
      {!isAdmin && !membership && !isLoadingMembership && (
        <Card className="mb-4 border-warning/50 bg-warning/10 p-3 md:p-4">
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

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Water Intake Card */}
        <Card className="p-3 md:p-6">
          <div className="mb-2 flex items-center justify-between md:mb-4">
            <h3 className="text-base font-semibold md:text-xl">Water Intake</h3>
            <Droplet className="h-6 w-6 text-blue-400 md:h-8 md:w-8" />
          </div>
          <div className="mb-3 md:mb-4">
            {isAnyDataLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-default-200 rounded animate-pulse md:h-10 md:w-20"></div>
                <div className="h-3 w-24 bg-default-200 rounded animate-pulse md:h-4 md:w-28"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold md:text-4xl">{waterCount}</div>
                <Text className="text-xs text-muted-foreground md:text-sm">glasses today</Text>
              </>
            )}
          </div>
          <Link href="/water">
            <Button variant="primary" size="sm" className="w-full md:text-base" isDisabled={isAnyDataLoading}>
              Track Water
            </Button>
          </Link>
        </Card>

        {/* Meals Card */}
        <Card className="p-3 md:p-6">
          <div className="mb-2 flex items-center justify-between md:mb-4">
            <h3 className="text-base font-semibold md:text-xl">Meals</h3>
            <Utensils className="h-6 w-6 text-orange-400 md:h-8 md:w-8" />
          </div>
          <div className="mb-3 md:mb-4">
            {isAnyDataLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-16 bg-default-200 rounded animate-pulse md:h-10 md:w-20"></div>
                <div className="h-3 w-28 bg-default-200 rounded animate-pulse md:h-4 md:w-32"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold md:text-4xl">{mealsCompleted}/5</div>
                <Text className="text-xs text-muted-foreground md:text-sm">meals completed</Text>
              </>
            )}
          </div>
          <Link href="/meals">
            <Button variant="primary" size="sm" className="w-full md:text-base" isDisabled={isAnyDataLoading}>
              Track Meals
            </Button>
          </Link>
        </Card>

        {/* Weight Card */}
        <Card className="p-3 md:p-6">
          <div className="mb-2 flex items-center justify-between md:mb-4">
            <h3 className="text-base font-semibold md:text-xl">Weight</h3>
            <Scale className="h-6 w-6 text-green-400 md:h-8 md:w-8" />
          </div>
          <div className="mb-3 md:mb-4">
            {isAnyDataLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-20 bg-default-200 rounded animate-pulse md:h-10 md:w-24"></div>
                <div className="h-3 w-32 bg-default-200 rounded animate-pulse md:h-4 md:w-36"></div>
              </div>
            ) : latestWeight ? (
              <>
                <div className="text-2xl font-bold md:text-4xl">
                  {latestWeight.weight.toFixed(1)}
                </div>
                <Text className="text-xs text-muted-foreground md:text-sm">
                  {latestWeight.unit} • {new Date(latestWeight.date).toLocaleDateString()}
                </Text>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold md:text-4xl">--</div>
                <Text className="text-xs text-muted-foreground md:text-sm">no logs yet</Text>
              </>
            )}
          </div>
          <Link href="/weight">
            <Button variant="primary" size="sm" className="w-full md:text-base" isDisabled={isAnyDataLoading}>
              {latestWeight ? 'View Progress' : 'Log Weight'}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="mt-3 p-3 md:mt-6 md:p-6">
        <h3 className="mb-2 text-base font-semibold md:mb-4 md:text-xl">Today's Summary</h3>
        {isAnyDataLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-default-200 rounded animate-pulse md:h-4 md:w-20"></div>
              <div className="h-6 w-24 bg-default-200 rounded animate-pulse md:h-8 md:w-28"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-default-200 rounded animate-pulse md:h-4 md:w-24"></div>
              <div className="h-6 w-16 bg-default-200 rounded animate-pulse md:h-8 md:w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-default-200 rounded animate-pulse md:h-4 md:w-28"></div>
              <div className="h-6 w-12 bg-default-200 rounded animate-pulse md:h-8 md:w-16"></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Text className="text-[10px] text-muted-foreground md:text-sm">Water Goal</Text>
              <div className="mt-0.5 text-lg font-bold md:text-2xl">{waterCount} / {waterTarget} glasses</div>
            </div>
            <div>
              <Text className="text-[10px] text-muted-foreground md:text-sm">Meals Today</Text>
              <div className="mt-0.5 text-lg font-bold md:text-2xl">{mealsCompleted}/5</div>
            </div>
            <div>
              <Text className="text-[10px] text-muted-foreground md:text-sm">Completion Rate</Text>
              <div className="mt-0.5 text-lg font-bold md:text-2xl">{Math.round((mealsCompleted / 5) * 100)}%</div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
