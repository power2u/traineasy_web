import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listPackages } from '@/app/actions/packages';
import { PackagesClient } from './packages-client';

export default async function PackagesPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const isSuperAdmin = session.user.role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  // Fetch initial packages
  const packagesResult = await listPackages();
  const initialPackages = packagesResult.success && packagesResult.packages
    ? packagesResult.packages
    : [];

  return <PackagesClient initialPackages={initialPackages} />;
}
