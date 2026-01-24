import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllBanners } from '@/app/actions/banners';
import { BannersClient } from './banners-client';

export default async function BannersAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  const isSuperAdmin = session.user.role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllBanners();
  const initialBanners = result.success ? result.banners || [] : [];

  return <BannersClient initialBanners={initialBanners} />;
}
