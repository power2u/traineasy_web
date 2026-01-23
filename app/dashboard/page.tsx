import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button, Card, Text } from '@heroui/react';
import Link from 'next/link';
import { getLatestWeightLog } from '@/app/actions/weight';
import { getTodayWaterCount, getWaterTarget } from '@/app/actions/water';
import { getTodayMeals } from '@/app/actions/meals';
import { getActiveMembership } from '@/app/actions/memberships';
import { Droplet, Utensils, Scale, Calendar, AlertCircle } from 'lucide-react';
import { EnableNotificationsButton } from '@/components/settings/enable-notifications-button';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const user = session.user;
  const userId = (user as any).id;

  // Check if user is admin - handle both location of role
  const isAdmin =
    (user as any).raw_app_meta_data?.role === 'super_admin' ||
    (user as any).raw_user_meta_data?.role === 'super_admin' ||
    (user as any).role === 'super_admin';

  // Parallel data fetching
  const [
    membershipResult,
    latestWeight,
    waterCountResult,
    waterTargetResult,
    mealsResult
  ] = await Promise.all([
    !isAdmin ? getActiveMembership(userId) : Promise.resolve({ success: true, membership: null }),
    getLatestWeightLog(userId),
    getTodayWaterCount(userId),
    getWaterTarget(userId),
    getTodayMeals(userId)
  ]);

  const membership = membershipResult.success ? membershipResult.membership : null;
  const latestWeightLog = latestWeight.success ? latestWeight.log : null;
  const waterCount = waterCountResult.success ? waterCountResult.count : 0;
  const waterTarget = waterTargetResult.success ? waterTargetResult.target : 14;

  // Calculate meals completed
  let mealsCompleted = 0;
  if (mealsResult.success && mealsResult.meals) {
    const meals = mealsResult.meals;
    mealsCompleted =
      (meals.breakfast_completed ? 1 : 0) +
      (meals.snack1_completed ? 1 : 0) +
      (meals.lunch_completed ? 1 : 0) +
      (meals.snack2_completed ? 1 : 0) +
      (meals.dinner_completed ? 1 : 0);
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold md:text-3xl">
          Welcome back, {user.name || user.email?.split('@')[0]}!
        </h2>
        {/* Show membership info only for non-admin users */}
        {!isAdmin && (
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
      {!isAdmin && !membership && (
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
            <div className="text-2xl font-bold md:text-4xl">{waterCount}</div>
            <Text className="text-xs text-muted-foreground md:text-sm">glasses today</Text>
          </div>
          <Link href="/water">
            <Button variant="primary" size="sm" className="w-full md:text-base">
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
            <div className="text-2xl font-bold md:text-4xl">{mealsCompleted}/5</div>
            <Text className="text-xs text-muted-foreground md:text-sm">meals completed</Text>
          </div>
          <Link href="/meals">
            <Button variant="primary" size="sm" className="w-full md:text-base">
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
            {latestWeightLog ? (
              <>
                <div className="text-2xl font-bold md:text-4xl">
                  {latestWeightLog.weight.toFixed(1)}
                </div>
                <Text className="text-xs text-muted-foreground md:text-sm">
                  {latestWeightLog.unit} • {latestWeightLog.date.toLocaleDateString()}
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
            <Button variant="primary" size="sm" className="w-full md:text-base">
              {latestWeightLog ? 'View Progress' : 'Log Weight'}
            </Button>
          </Link>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="mt-3 p-3 md:mt-6 md:p-6">
        <h3 className="mb-2 text-base font-semibold md:mb-4 md:text-xl">Today's Summary</h3>
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
      </Card>
    </>
  );
}
