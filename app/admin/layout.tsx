import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { validateUserRole } from '@/lib/utils/server-auth';

// Component that handles the tabs - can remain client-side or be simple server rendering with links
import { AdminTabs } from './admin-tabs';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/auth/login?error=auth_required');
  }

  // Server-side role validation (more secure than JWT token)
  const userRole = await validateUserRole(session.user.id);
  
  if (userRole !== 'super_admin') {
    console.warn(`[Security] Non-admin user attempted admin access: ${session.user.email} (${session.user.id})`);
    redirect('/dashboard?error=admin_required');
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl font-bold md:text-3xl">Admin Panel</h1>
        <p className="text-xs text-default-500 mt-0.5 md:text-base md:mt-2">
          Manage users and system settings
        </p>
      </div>

      {/* Navigation Tabs */}
      <AdminTabs />

      {/* Page Content */}
      {children}
    </>
  );
}
