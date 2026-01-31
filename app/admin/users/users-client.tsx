'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Spinner, TextField, Label, Input, Chip, Select, ListBox } from '@heroui/react';
import { Edit2, RefreshCw, Eye } from 'lucide-react';
import {
    createUser,
    deleteUser,
    promoteToSuperAdmin,
    listUsers,
    disableUser,
    enableUser,
    resetUserPassword,
} from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
import { createMembership, syncMembershipStatus } from '@/app/actions/memberships';

export interface User {
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

interface UsersClientProps {
    initialUsers: User[];
    initialPackages: any[];
    currentUser: any;
}

export function UsersClient({ initialUsers, initialPackages, currentUser }: UsersClientProps) {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [filteredUsers, setFilteredUsers] = useState<User[]>(initialUsers);
    const [packages, setPackages] = useState<any[]>(initialPackages);
    const [isLoading, setIsLoading] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');

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

    const applyFilter = useCallback(() => {
        let filtered = [...users];

        switch (filter) {
            case 'active':
                filtered = filtered.filter(u => !u.is_banned);
                break;
            case 'disabled':
                filtered = filtered.filter(u => u.is_banned);
                break;
            case 'admins':
                filtered = filtered.filter(u => u.role === 'super_admin');
                break;
            default:
                break;
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(u =>
                u.email.toLowerCase().includes(query) ||
                (u.display_name && u.display_name.toLowerCase().includes(query)) ||
                u.id.toLowerCase().includes(query)
            );
        }

        setFilteredUsers(filtered);
    }, [users, filter, searchQuery]);

    useEffect(() => {
        applyFilter();
    }, [users, filter, searchQuery, applyFilter]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const result = await listUsers();
            if (result.success && result.users) {
                setUsers(result.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
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
                router.refresh();
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
                router.refresh();
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
                router.refresh();
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
                router.refresh();
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
                router.refresh();
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



    const stats = {
        total: users.length,
        admins: users.filter((u) => u.role === 'super_admin').length,
        disabled: users.filter((u) => u.is_banned).length,
        active: users.filter((u) => !u.is_banned).length,
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4 md:gap-6 md:mb-8">
                <Card
                    className={`p-4 md:p-6 cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-blue-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
                    onClick={() => setFilter('all')}
                >
                    <div className="text-xs text-default-500 mb-1 md:text-sm md:mb-2">Total Users</div>
                    <div className="text-2xl font-bold md:text-3xl">{stats.total}</div>
                </Card>
                <Card
                    className={`p-4 md:p-6 cursor-pointer transition-all ${filter === 'active' ? 'ring-2 ring-green-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
                    onClick={() => setFilter('active')}
                >
                    <div className="text-xs text-default-500 mb-1 md:text-sm md:mb-2">Active</div>
                    <div className="text-2xl font-bold text-green-500 md:text-3xl">{stats.active}</div>
                </Card>
                <Card
                    className={`p-4 md:p-6 cursor-pointer transition-all ${filter === 'disabled' ? 'ring-2 ring-red-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
                    onClick={() => setFilter('disabled')}
                >
                    <div className="text-xs text-default-500 mb-1 md:text-sm md:mb-2">Disabled</div>
                    <div className="text-2xl font-bold text-red-500 md:text-3xl">{stats.disabled}</div>
                </Card>
                <Card
                    className={`p-4 md:p-6 cursor-pointer transition-all ${filter === 'admins' ? 'ring-2 ring-blue-500' : 'hover:bg-default-100 dark:hover:bg-default-50'}`}
                    onClick={() => setFilter('admins')}
                >
                    <div className="text-xs text-default-500 mb-1 md:text-sm md:mb-2">Admins</div>
                    <div className="text-2xl font-bold text-blue-500 md:text-3xl">{stats.admins}</div>
                </Card>
            </div>

            <Card className="p-4 md:p-6">
                <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold md:text-xl">
                            Users ({filteredUsers.length})
                            {(filter !== 'all' || searchQuery.trim()) && <span className="text-sm text-gray-400 ml-2">• Filtered</span>}
                        </h2>
                        <p className="text-sm text-default-500 mt-1">Manage user accounts and permissions</p>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                        <Button variant="ghost" size="sm" onPress={loadUsers} isDisabled={isLoading}>
                            {isLoading ? 'Loading...' : 'Refresh'}
                        </Button>

                        <Button variant="primary" size="sm" onPress={() => setIsCreateModalOpen(true)}>
                            <span className="hidden sm:inline">+ Create User</span>
                            <span className="sm:hidden">+ User</span>
                        </Button>
                    </div>
                </div>

                <div className="mb-6">
                    <TextField>
                        <Label>Search Users</Label>
                        <Input
                            placeholder="Search by email, name, or user ID..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </TextField>
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
                    <>
                        <div className="block md:hidden">
                            <div className="overflow-x-auto -mx-4">
                                <div className="min-w-[750px] px-4">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-default-200">
                                                <th className="text-left py-3 px-2 text-sm font-semibold text-default-600 min-w-[200px]">User</th>
                                                <th className="text-left py-3 px-2 text-sm font-semibold text-default-600 min-w-[120px]">Status</th>
                                                <th className="text-left py-3 px-2 text-sm font-semibold text-default-600 min-w-[150px]">Plan</th>
                                                <th className="text-right py-3 px-2 text-sm font-semibold text-default-600 min-w-[120px]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.map((u) => (
                                                <tr key={u.id} className="border-b border-default-200 hover:bg-default-100/50 dark:hover:bg-default-50/50 transition-colors">
                                                    <td className="py-3 px-2 min-w-[200px]">
                                                        <div>
                                                            <div className="font-medium text-sm break-all">{u.email}</div>
                                                            {u.display_name && (
                                                                <div className="text-xs text-default-500 mt-0.5">{u.display_name}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 min-w-[120px]">
                                                        <div className="flex flex-col gap-1">
                                                            {u.role === 'super_admin' && (
                                                                <Chip size="sm" variant="soft" color="accent">Admin</Chip>
                                                            )}
                                                            {u.is_banned ? (
                                                                <Chip size="sm" variant="soft" color="danger">Disabled</Chip>
                                                            ) : (
                                                                <Chip size="sm" variant="soft" color="success">Active</Chip>
                                                            )}
                                                            {!u.email_confirmed_at && (
                                                                <Chip size="sm" variant="soft" color="warning">Unverified</Chip>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 min-w-[150px]">
                                                        {u.role === 'super_admin' ? (
                                                            <span className="text-xs text-default-400">N/A</span>
                                                        ) : u.activeMembership ? (
                                                            <div className="text-xs">
                                                                <div className="font-medium">{u.activeMembership.package_name}</div>
                                                                <div className={u.activeMembership.is_expired ? 'text-red-500' : u.activeMembership.days_remaining <= 3 ? 'text-yellow-500' : 'text-green-500'}>
                                                                    {u.activeMembership.is_expired ? 'Expired' : `${u.activeMembership.days_remaining}d left`}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-default-500">No Plan</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onPress={() => openMembershipModal(u)}
                                                                    className="text-xs px-2 py-0.5"
                                                                >
                                                                    Assign
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 min-w-[120px]">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onPress={() => router.push(`/user-details/${u.id}`)}
                                                                className="text-xs px-2 py-1"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                            {u.id !== currentUser.id && (
                                                                <Button
                                                                    size="sm"
                                                                    variant={u.is_banned ? 'primary' : 'danger'}
                                                                    onPress={() => handleToggleUserStatus(u.id, u.email, u.is_banned)}
                                                                    className="text-xs px-2 py-1"
                                                                >
                                                                    {u.is_banned ? 'Enable' : 'Disable'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-default-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-default-600">User</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-default-600">Role</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-default-600">Membership</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-default-600">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-default-600">Last Sign In</th>
                                        <th className="text-right py-3 px-4 text-sm font-semibold text-default-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="border-b border-default-200 hover:bg-default-100/50 dark:hover:bg-default-50/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div>
                                                    <div className="font-medium text-base break-all">{u.email}</div>
                                                    {u.display_name && (
                                                        <div className="text-sm text-default-500">{u.display_name}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {u.role === 'super_admin' ? (
                                                    <Chip size="sm" variant="soft" color="accent">Admin</Chip>
                                                ) : (
                                                    <span className="text-sm text-default-500">User</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                {u.role === 'super_admin' ? (
                                                    <span className="text-sm text-default-400">N/A</span>
                                                ) : u.activeMembership ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-sm font-medium">{u.activeMembership.package_name}</span>
                                                            <span className={`text-xs ${u.activeMembership.is_expired ? 'text-red-500' : u.activeMembership.days_remaining <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
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
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col gap-1">
                                                    {u.is_banned ? (
                                                        <Chip size="sm" variant="soft" color="danger">Disabled</Chip>
                                                    ) : (
                                                        <Chip size="sm" variant="soft" color="success">Active</Chip>
                                                    )}
                                                    {!u.email_confirmed_at && (
                                                        <Chip size="sm" variant="soft" color="warning">Unverified</Chip>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-sm text-default-500">
                                                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onPress={() => router.push(`/user-details/${u.id}`)}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        View
                                                    </Button>
                                                    {u.id !== currentUser.id ? (
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
                    </>
                )}
            </Card>

            {/* Create User Modal - Logic maintained from before */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsCreateModalOpen(false);
                        setCreateError('');
                        setCreateSuccess('');
                    }
                }}>
                    <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">Create New User</h2>

                        <form onSubmit={handleCreateUser} className="space-y-4">
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

                            <Select
                                selectedKey={createPackageId === '' ? '__none__' : (createPackageId || null)}
                                onSelectionChange={(key) => {
                                    const selectedValue = key === '__none__' ? '' : (key ? String(key) : '');
                                    setCreatePackageId(selectedValue);
                                }}
                                isDisabled={isCreating}
                            >
                                <Label>Package (Optional)</Label>
                                <Select.Trigger>
                                    <Select.Value>
                                        {(() => {
                                            if (!createPackageId) return 'No package (assign later)';
                                            const selectedPkg = packages.find(p => p.id === createPackageId);
                                            return selectedPkg
                                                ? `${selectedPkg.name} - ₹${selectedPkg.price} (${selectedPkg.duration_days} days)`
                                                : 'No package (assign later)';
                                        })()}
                                    </Select.Value>
                                    <Select.Indicator />
                                </Select.Trigger>
                                <p className="text-xs text-default-500 mt-1">
                                    You can assign a package now or later from the users table
                                </p>
                                <Select.Popover>
                                    <ListBox>
                                        <ListBox.Item id="__none__" textValue="No package (assign later)">
                                            No package (assign later)
                                        </ListBox.Item>
                                        {packages.map((pkg) => (
                                            <ListBox.Item key={pkg.id} id={pkg.id} textValue={`${pkg.name} - ₹${pkg.price} (${pkg.duration_days} days)`}>
                                                {pkg.name} - ₹{pkg.price} ({pkg.duration_days} days)
                                            </ListBox.Item>
                                        ))}
                                    </ListBox>
                                </Select.Popover>
                            </Select>

                            {createError && <div className="text-sm text-red-500">{createError}</div>}
                            {createSuccess && <div className="text-sm text-green-500">{createSuccess}</div>}

                            <div className="flex gap-3 pt-4">
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
                    <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-2">
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

                        <div className="space-y-4">
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
                                    isDisabled={isAssigningMembership}
                                >
                                    {isAssigningMembership ? 'Assigning...' : 'Assign Package'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
