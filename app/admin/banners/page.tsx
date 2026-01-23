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

  const user = session.user as any;
  const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role || user.role;
  const isSuperAdmin = role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllBanners();
  const initialBanners = result.success ? result.banners || [] : [];

  return <BannersClient initialBanners={initialBanners} />;
}
