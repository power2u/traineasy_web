import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
import { getActiveMembership } from '@/app/actions/memberships';
import { UsersClient, User } from './users-client';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const isSuperAdmin = session.user.role === 'super_admin';
  const user = session.user;

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  // Fetch data
  const [usersResult, packagesResult] = await Promise.all([
    listUsers(),
    listPackages()
  ]);

  let initialUsers: User[] = [];
  if (usersResult.success && usersResult.users) {
    // Populate active membership for each user
    // We execute this in parallel for performance, though for many users this might be heavy.
    // Ideally we'd have a bulk API, but reusing existing actions for now.
    initialUsers = await Promise.all(
      usersResult.users.map(async (u: any) => {
        const membershipResult = await getActiveMembership(u.id);

        // Map to the User type expected by client
        return {
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          role: u.role,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          is_banned: u.is_banned,
          email_confirmed_at: u.email_confirmed_at,
          provider: u.provider,
          activeMembership: membershipResult.membership ? {
            package_name: membershipResult.membership.package_name,
            days_remaining: membershipResult.membership.days_remaining,
            is_expired: membershipResult.membership.is_expired,
          } : null,
        };
      })
    );
  }

  const initialPackages = packagesResult.success && packagesResult.packages
    ? packagesResult.packages.filter((p: any) => p.is_active)
    : [];

  return (
    <UsersClient
      initialUsers={initialUsers}
      initialPackages={initialPackages}
      currentUser={user}
    />
  );
}
