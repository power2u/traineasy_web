'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, Spinner, TextField, Label, Input, Chip } from '@heroui/react';
import { Edit2, RefreshCw } from 'lucide-react';
import {
  createUser,
  deleteUser,
  promoteToSuperAdmin,
  listUsers,
  disableUser,
  enableUser,
  resetUserPassword,
} from '@/app/actions/admin';
import { listPackages, assignPackageToUser } from '@/app/actions/packages';
import { getActiveMembership, createMembership, syncMembershipStatus } from '@/app/actions/memberships';

interface User {
  id: string;
  email: string;
  display_name?: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  is_banned: boolean;
  email_confirmed_at?: string | null;
  provider: string;
  activeMembership?: {
    package_name: string;
    days_remaining: number;
    is_expired: boolean;
  } | null;
}

type FilterType = 'all' | 'active' | 'disabled' | 'admins';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  // Create user modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createPackageId, setCreatePackageId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Membership modal
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isAssigningMembership, setIsAssigningMembership] = useState(false);
  const [membershipError, setMembershipError] = useState('');

  useEffect(() => {
    if (user) {
      const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
      const isSuperAdmin = role === 'super_admin';
      setIsAdmin(isSuperAdmin);

      if (!isSuperAdmin) {
        router.push('/dashboard');
      } else {
        loadUsers();
        loadPackages();
      }
    }
  }, [user, router]);

  const loadPackages = async () => {
    try {
      const result = await listPackages();
      if (result.success) {
        setPackages(result.packages.filter((p: any) => p.is_active));
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  useEffect(() => {
    applyFilter();
  }, [users, filter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await listUsers();
      if (result.success && result.users) {
        // Load active membership for each user
        const usersWithMemberships = await Promise.all(
          result.users.map(async (u: User) => {
            const membershipResult = await getActiveMembership(u.id);
            return {
              ...u,
              activeMembership: membershipResult.membership ? {
                package_name: membershipResult.membership.package_name,
                days_remaining: membershipResult.membership.days_remaining,
                is_expired: membershipResult.membership.is_expired,
              } : null,
            };
          })
        );
        setUsers(usersWithMemberships);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...users];

    switch (filter) {
      case 'active':
        filtered = users.filter(u => !u.is_banned);
        break;
      case 'disabled':
        filtered = users.filter(u => u.is_banned);
        break;
      case 'admins':
        filtered = users.filter(u => u.role === 'super_admin');
        break;
      default:
        filtered = users;
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!email || !password) {
      setCreateError('Email and password are required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createUser(email, password, displayName || '');

      if (result.success && result.user) {
        // If package selected, assign it
        if (createPackageId) {
          const selectedPkg = packages.find(p => p.id === createPackageId);
          if (selectedPkg) {
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + (selectedPkg.duration_days - 1) * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0];

            await createMembership({
              user_id: result.user.id,
              package_id: createPackageId,
              start_date: startDate,
              end_date: endDate,
            });
          }
        }

        setCreateSuccess(`User ${email} created successfully!`);
        setEmail('');
        setPassword('');
        setDisplayName('');
        setCreatePackageId('');
        await loadUsers();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateSuccess('');
        }, 1500);
      } else {
        setCreateError(result.error || 'Failed to create user');
      }
    } catch (error) {
      setCreateError('An error occurred while creating user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) return;

    try {
      const result = await deleteUser(userId);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('An error occurred while deleting user');
    }
  };

  const handlePromoteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to promote ${userEmail} to super admin?`)) return;

    try {
      const result = await promoteToSuperAdmin(userId);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || 'Failed to promote user');
      }
    } catch (error) {
      alert('An error occurred while promoting user');
    }
  };

  const handleToggleUserStatus = async (userId: string, userEmail: string, isBanned: boolean) => {
    const action = isBanned ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} login for ${userEmail}?`)) return;

    try {
      const result = isBanned ? await enableUser(userId) : await disableUser(userId);
      if (result.success) {
        await loadUsers();
      } else {
        alert(result.error || `Failed to ${action} user`);
      }
    } catch (error) {
      alert(`An error occurred while ${action}ing user`);
    }
  };

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const newPassword = prompt(`Enter new password for ${userEmail} (minimum 6 characters):`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await resetUserPassword(userId, newPassword);
      if (result.success) {
        alert('Password reset successfully!');
      } else {
        alert(result.error || 'Failed to reset password');
      }
    } catch (error) {
      alert('An error occurred while resetting password');
    }
  };

  const openMembershipModal = (user: User) => {
    setSelectedUser(user);
    setSelectedPackageId('');
    setMembershipError('');
    setIsMembershipModalOpen(true);
  };

  const handleAssignMembership = async () => {
    if (!selectedUser || !selectedPackageId) {
      setMembershipError('Please select a package');
      return;
    }

    setIsAssigningMembership(true);
    setMembershipError('');

    try {
      const selectedPkg = packages.find(p => p.id === selectedPackageId);
      if (!selectedPkg) {
        setMembershipError('Invalid package selected');
        return;
      }

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + selectedPkg.duration_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await createMembership({
        user_id: selectedUser.id,
        package_id: selectedPackageId,
        start_date: startDate,
        end_date: endDate,
      });

      if (result.success) {
        await loadUsers();
        setIsMembershipModalOpen(false);
        setSelectedUser(null);
        setSelectedPackageId('');
      } else {
        setMembershipError(result.error || 'Failed to assign membership');
      }
    } catch (error) {
      setMembershipError('An error occurred while assigning membership');
    } finally {
      setIsAssigningMembership(false);
    }
  };

  const handleSyncStatus = async () => {
    if (!confirm('This will expire all past-due memberships and disable login for those users. Continue?')) return;

    setIsLoading(true);
    try {
      const result = await syncMembershipStatus();
      if (result.success) {
        alert(result.message);
        await loadUsers();
      } else {
        alert('Failed to sync status: ' + result.error);
      }
    } catch (error) {
      alert('An error occurred during sync');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'super_admin').length,
    disabled: users.filter((u) => u.is_banned).length,
    active: users.filter((u) => !u.is_banned).length,
  };

  return (
    <>
      {/* Statistics Cards - Now Clickable */}
      {!isLoading && users.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-4 md:gap-6 md:mb-8">
          <Card
            className={`p-3 md:p-6 cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-blue-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
            onClick={() => setFilter('all')}
          >
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Total Users</div>
            <div className="text-xl font-bold md:text-3xl">{stats.total}</div>
          </Card>
          <Card
            className={`p-3 md:p-6 cursor-pointer transition-all ${filter === 'active' ? 'ring-2 ring-green-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
            onClick={() => setFilter('active')}
          >
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Active</div>
            <div className="text-xl font-bold text-green-500 md:text-3xl">{stats.active}</div>
          </Card>
          <Card
            className={`p-3 md:p-6 cursor-pointer transition-all ${filter === 'disabled' ? 'ring-2 ring-red-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
            onClick={() => setFilter('disabled')}
          >
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Disabled</div>
            <div className="text-xl font-bold text-red-500 md:text-3xl">{stats.disabled}</div>
          </Card>
          <Card
            className={`p-3 md:p-6 cursor-pointer transition-all ${filter === 'admins' ? 'ring-2 ring-blue-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
            onClick={() => setFilter('admins')}
          >
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Admins</div>
            <div className="text-xl font-bold text-blue-500 md:text-3xl">{stats.admins}</div>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:mb-6">
          <div>
            <h2 className="text-base font-semibold md:text-xl">
              Users ({filteredUsers.length})
              {filter !== 'all' && <span className="text-sm text-gray-400 ml-2">• Filtered</span>}
            </h2>
            <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">Manage user accounts and permissions</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onPress={loadUsers} isDisabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="ghost" size="sm" onPress={handleSyncStatus} isDisabled={isLoading}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Sync Status
            </Button>
            <Button variant="primary" size="sm" onPress={() => setIsCreateModalOpen(true)}>
              + Create User
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-default-400">
            No users found {filter !== 'all' && 'with this filter'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-default-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">User</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Role</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 hidden sm:table-cell md:py-3 md:px-4 md:text-sm">Membership</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Status</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 hidden md:table-cell md:py-3 md:px-4 md:text-sm">Last Sign In</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-default-200 hover:bg-default-100/50 dark:hover:bg-default-50/50 transition-colors">
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div>
                        <div className="font-medium text-xs md:text-base">{u.email}</div>
                        {u.display_name && (
                          <div className="text-[10px] text-default-500 md:text-sm">{u.display_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      {u.role === 'super_admin' ? (
                        <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-500 rounded md:px-2 md:py-1 md:text-xs">Admin</span>
                      ) : (
                        <span className="text-xs text-default-500 md:text-sm">User</span>
                      )}
                    </td>
                    <td className="py-2 px-2 hidden sm:table-cell md:py-4 md:px-4">
                      {u.role === 'super_admin' ? (
                        <span className="text-xs text-default-400 md:text-sm">N/A</span>
                      ) : u.activeMembership ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium md:text-sm">{u.activeMembership.package_name}</span>
                            <span className={`text-[10px] md:text-xs ${u.activeMembership.is_expired ? 'text-red-500' : u.activeMembership.days_remaining <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                              {u.activeMembership.is_expired ? 'Expired' : `${u.activeMembership.days_remaining} days left`}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => openMembershipModal(u)}
                            className="min-w-0 px-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Chip size="sm" variant="soft">No Plan</Chip>
                          <Button
                            size="sm"
                            variant="primary"
                            onPress={() => openMembershipModal(u)}
                            className="text-xs"
                          >
                            Assign
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-2">
                        {u.is_banned ? (
                          <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-500 rounded md:px-2 md:py-1 md:text-xs">Disabled</span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-500 rounded md:px-2 md:py-1 md:text-xs">Active</span>
                        )}
                        {!u.email_confirmed_at && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-500 rounded md:px-2 md:py-1 md:text-xs">Unverified</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell md:py-4 md:px-4">
                      <span className="text-xs text-default-500 md:text-sm">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="flex flex-col items-end gap-1 md:flex-row md:items-center md:justify-end md:gap-2">
                        {u.id !== user.id ? (
                          <>
                            <Button size="sm" variant={u.is_banned ? 'primary' : 'ghost'} onPress={() => handleToggleUserStatus(u.id, u.email, u.is_banned)}>
                              {u.is_banned ? 'Enable' : 'Disable'}
                            </Button>
                            {u.provider === 'email' && (
                              <Button size="sm" variant="ghost" onPress={() => handleResetPassword(u.id, u.email)}>Reset</Button>
                            )}
                            {u.role !== 'super_admin' && (
                              <Button size="sm" variant="ghost" onPress={() => handlePromoteUser(u.id, u.email)}>Promote</Button>
                            )}
                            <Button size="sm" variant="danger" onPress={() => handleDeleteUser(u.id, u.email)}>Delete</Button>
                          </>
                        ) : (
                          <span className="text-xs text-default-400">(You)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsCreateModalOpen(false);
            setCreateError('');
            setCreateSuccess('');
          }
        }}>
          <Card className="w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-3 md:text-xl md:mb-4">Create New User</h2>

            <form onSubmit={handleCreateUser} className="space-y-3 md:space-y-4">
              <TextField value={email} onChange={setEmail} isRequired isDisabled={isCreating}>
                <Label>Email</Label>
                <Input type="email" placeholder="user@example.com" />
              </TextField>

              <TextField value={password} onChange={setPassword} isRequired isDisabled={isCreating}>
                <Label>Password</Label>
                <Input type="password" placeholder="Minimum 6 characters" />
              </TextField>

              <TextField value={displayName} onChange={setDisplayName} isDisabled={isCreating}>
                <Label>Display Name (Optional)</Label>
                <Input type="text" placeholder="John Doe" />
              </TextField>

              <div>
                <Label className="mb-2 block">Package (Optional)</Label>
                <select
                  value={createPackageId}
                  onChange={(e) => setCreatePackageId(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 rounded-lg border-2 border-default-200 bg-default-50 dark:bg-default-100 text-sm focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">No package (assign later)</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - ₹{pkg.price} ({pkg.duration_days} days)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-default-500 mt-1">
                  You can assign a package now or later from the users table
                </p>
              </div>

              {createError && <div className="text-sm text-red-500">{createError}</div>}
              {createSuccess && <div className="text-sm text-green-500">{createSuccess}</div>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onPress={() => {
                  setIsCreateModalOpen(false);
                  setCreateError('');
                  setCreateSuccess('');
                  setEmail('');
                  setPassword('');
                  setDisplayName('');
                  setCreatePackageId('');
                }} isDisabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" isDisabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Membership Assignment Modal */}
      {isMembershipModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsMembershipModalOpen(false);
            setSelectedUser(null);
            setMembershipError('');
          }
        }}>
          <Card className="w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-2 md:text-xl">
              {selectedUser.activeMembership ? 'Change Membership' : 'Assign Membership'}
            </h2>
            <p className="text-sm text-default-500 mb-4">
              {selectedUser.display_name || selectedUser.email}
            </p>

            {selectedUser.activeMembership && (
              <div className="mb-4 p-3 bg-default-100 rounded-lg">
                <div className="text-xs text-default-500 mb-1">Current Plan</div>
                <div className="font-medium">{selectedUser.activeMembership.package_name}</div>
                <div className={`text-sm ${selectedUser.activeMembership.is_expired ? 'text-red-500' : selectedUser.activeMembership.days_remaining <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {selectedUser.activeMembership.is_expired ? 'Expired' : `${selectedUser.activeMembership.days_remaining} days remaining`}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Select Package</Label>
                <div className="space-y-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackageId(pkg.id)}
                      disabled={isAssigningMembership}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedPackageId === pkg.id
                        ? 'border-primary bg-primary/10'
                        : 'border-default-200 hover:border-default-300'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-sm text-default-500 mt-1">
                        ₹{pkg.price} • {pkg.duration_days} days
                      </div>
                      {pkg.description && (
                        <div className="text-xs text-default-400 mt-1">{pkg.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {membershipError && (
                <div className="text-sm text-red-500">{membershipError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setIsMembershipModalOpen(false);
                    setSelectedUser(null);
                    setMembershipError('');
                  }}
                  isDisabled={isAssigningMembership}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  onPress={handleAssignMembership}
                  isDisabled={isAssigningMembership || !selectedPackageId}
                >
                  {isAssigningMembership ? 'Assigning...' : 'Assign Plan'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
