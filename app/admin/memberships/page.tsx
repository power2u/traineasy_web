import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
import { getMembershipStats } from '@/app/actions/memberships';
import { MembershipsClient } from './memberships-client';

export default async function AdminMembershipsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const user = session.user as any;
  const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role || user.role;
  const isSuperAdmin = role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  // Fetch data
  const [usersResult, packagesResult, statsResult] = await Promise.all([
    listUsers(),
    listPackages(),
    getMembershipStats(),
  ]);

  const initialUsers = usersResult.success ? usersResult.users || [] : [];
  const initialPackages = packagesResult.success ? packagesResult.packages || [] : [];
  const initialStats = statsResult.success ? statsResult.stats : null;

  return (
    <MembershipsClient
      initialUsers={initialUsers}
      initialPackages={initialPackages}
      initialStats={initialStats}
    />
  );
}
