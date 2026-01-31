import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listUsers } from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
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
    // Cast to User[] type - listUsers now returns compatible structure with activeMembership
    initialUsers = usersResult.users as unknown as User[];
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
