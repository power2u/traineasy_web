import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAdminUserDetails } from '@/app/actions/admin-details';
import { UserProfileEditClient } from './user-profile-edit-client';
import { Button } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserProfileEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  // Check admin role
  const role = (session.user as any).role;
  const isSuperAdmin = role === 'super_admin';

  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  const { userId } = await params;
  const result = await getAdminUserDetails(userId);

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error Loading User</h1>
        <p className="text-default-500 mb-6">{result.error || 'Unknown error occurred'}</p>
        <Link href="/admin/users">
          <Button variant="ghost" className="flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </Button>
        </Link>
      </div>
    );
  }

  // Convert Prisma Decimal fields to numbers for client compatibility
  const userData = {
    ...result.data.user,
    heightCm: result.data.user.heightCm ? Number(result.data.user.heightCm) : null,
    goalWeight: result.data.user.goalWeight ? Number(result.data.user.goalWeight) : null,
  };

  return <UserProfileEditClient userId={userId} initialData={userData} />;
}