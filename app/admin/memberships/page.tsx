<<<<<<< HEAD
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, Spinner, TextField, Label, Input, Select, SelectValue, ListBox, ListBoxItem } from '@heroui/react';
import { listUsers } from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
import { 
  createMembership, 
  getUserMemberships, 
  cancelMembership,
  getMembershipStats,
  type UserMembership 
} from '@/app/actions/memberships';
import { Calendar, Package, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminMembershipsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create membership modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // View memberships
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const isSuperAdmin =
      user.raw_app_meta_data?.role === 'super_admin' ||
      user.raw_user_meta_data?.role === 'super_admin';

    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersResult, packagesResult, statsResult] = await Promise.all([
        listUsers(),
        listPackages(),
        getMembershipStats(),
      ]);

      if (usersResult.success) {
        setUsers(usersResult.users || []);
      }

      if (packagesResult.success) {
        setPackages(packagesResult.packages || []);
      }

      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMembership = async () => {
    if (!selectedUserId || !selectedPackageId) {
      setCreateError('Please select both user and package');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const selectedPackage = packages.find(p => p.id === selectedPackageId);
      if (!selectedPackage) {
        throw new Error('Package not found');
      }

      // Calculate end date based on package duration
      const start = new Date(startDate);
      const end = new Date(start);
      // Subtract 1 because if you start on day 1, a 30-day plan should end on day 30 (not day 31)
      // Example: Jan 1 + 30 days - 1 = Jan 30 (which is correct for a 30-day plan)
      end.setDate(end.getDate() + selectedPackage.duration_days - 1);

      const result = await createMembership({
        user_id: selectedUserId,
        package_id: selectedPackageId,
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        notes,
      });

      if (result.success) {
        setIsCreateModalOpen(false);
        setSelectedUserId('');
        setSelectedPackageId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        await loadData();
        alert('Membership created successfully!');
      } else {
        setCreateError(result.error || 'Failed to create membership');
      }
    } catch (error: any) {
      setCreateError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewMemberships = async (userId: string) => {
    setViewingUserId(userId);
    setIsLoadingMemberships(true);

    try {
      const result = await getUserMemberships(userId);
      if (result.success) {
        setUserMemberships(result.memberships);
      }
    } catch (error) {
      console.error('Failed to load memberships:', error);
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  const handleCancelMembership = async (membershipId: string) => {
    if (!confirm('Are you sure you want to cancel this membership?')) {
      return;
    }

    try {
      const result = await cancelMembership(membershipId);
      if (result.success) {
        if (viewingUserId) {
          await handleViewMemberships(viewingUserId);
        }
        await loadData();
        alert('Membership cancelled successfully!');
      } else {
        alert('Failed to cancel membership: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-1 text-xs font-medium text-success"><CheckCircle className="h-3 w-3" /> Active</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive"><XCircle className="h-3 w-3" /> Expired</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-muted/20 px-2 py-1 text-xs font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default:
        return <span className="rounded-full bg-muted px-2 py-1 text-xs">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Membership Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign and manage user package memberships
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Memberships</p>
                <p className="mt-1 text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="mt-1 text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.cancelled}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      )}

      {/* Create Membership Button */}
      <div className="mb-6">
        <Button
          variant="primary"
          size="lg"
          onPress={() => setIsCreateModalOpen(true)}
        >
          Assign New Membership
        </Button>
      </div>

      {/* Create Membership Modal */}
      {isCreateModalOpen && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">Assign New Membership</h2>
          
          {createError && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <Select 
              selectedKey={selectedUserId} 
              onSelectionChange={(key) => setSelectedUserId(key as string)} 
              isDisabled={isCreating}
            >
              <Label>Select User</Label>
              <Button>
                <SelectValue>
                  {selectedUserId 
                    ? users.find(u => u.id === selectedUserId)?.display_name || users.find(u => u.id === selectedUserId)?.email || 'Choose a user...'
                    : 'Choose a user...'
                  }
                </SelectValue>
              </Button>
              <ListBox>
                <ListBoxItem id="">Choose a user...</ListBoxItem>
                {users.map((u) => (
                  <ListBoxItem key={u.id} id={u.id}>
                    {u.display_name || u.email}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select>

            <Select 
              selectedKey={selectedPackageId} 
              onSelectionChange={(key) => setSelectedPackageId(key as string)} 
              isDisabled={isCreating}
            >
              <Label>Select Package</Label>
              <Button>
                <SelectValue>
                  {selectedPackageId 
                    ? packages.find(p => p.id === selectedPackageId)?.name + ` - ${packages.find(p => p.id === selectedPackageId)?.duration_days} days - ₹${packages.find(p => p.id === selectedPackageId)?.price}` || 'Choose a package...'
                    : 'Choose a package...'
                  }
                </SelectValue>
              </Button>
              <ListBox>
                <ListBoxItem id="">Choose a package...</ListBoxItem>
                {packages.map((p) => (
                  <ListBoxItem key={p.id} id={p.id}>
                    {p.name} - {p.duration_days} days - ₹{p.price}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select>

            <TextField value={startDate} onChange={setStartDate} isDisabled={isCreating}>
              <Label>Start Date</Label>
              <Input type="date" />
            </TextField>

            <TextField value={notes} onChange={setNotes} isDisabled={isCreating}>
              <Label>Notes (Optional)</Label>
              <Input type="text" placeholder="Any additional notes..." />
            </TextField>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onPress={handleCreateMembership}
                isDisabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Membership'}
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setCreateError('');
                }}
                isDisabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{u.display_name || u.email}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleViewMemberships(u.id)}
              >
                View Memberships
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* View Memberships Modal */}
      {viewingUserId && (
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Memberships</h2>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setViewingUserId(null)}
            >
              Close
            </Button>
          </div>

          {isLoadingMemberships ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : userMemberships.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No memberships found for this user
            </p>
          ) : (
            <div className="space-y-3">
              {userMemberships.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{m.package_name}</h3>
                        {getStatusBadge(m.status)}
                      </div>
                      <div className="mt-2 grid gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(m.start_date).toLocaleDateString()} - {new Date(m.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {m.status === 'active' && !m.is_expired && (
                          <div className="text-primary">
                            Day {m.days_elapsed + 1} of {m.total_days} • {m.days_remaining} days remaining
                          </div>
                        )}
                        {m.notes && (
                          <div className="text-muted-foreground">
                            Note: {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    {m.status === 'active' && (
                      <Button
                        variant="danger-soft"
                        size="sm"
                        onPress={() => handleCancelMembership(m.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
=======
'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, Spinner, TextField, Label, Input, Select, SelectValue, ListBox, ListBoxItem } from '@heroui/react';
import { listUsers } from '@/app/actions/admin';
import { listPackages } from '@/app/actions/packages';
import { 
  createMembership, 
  getUserMemberships, 
  cancelMembership,
  getMembershipStats,
  type UserMembership 
} from '@/app/actions/memberships';
import { Calendar, Package, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminMembershipsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create membership modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // View memberships
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const isSuperAdmin =
      user.raw_app_meta_data?.role === 'super_admin' ||
      user.raw_user_meta_data?.role === 'super_admin';

    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersResult, packagesResult, statsResult] = await Promise.all([
        listUsers(),
        listPackages(),
        getMembershipStats(),
      ]);

      if (usersResult.success) {
        setUsers(usersResult.users || []);
      }

      if (packagesResult.success) {
        setPackages(packagesResult.packages || []);
      }

      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMembership = async () => {
    if (!selectedUserId || !selectedPackageId) {
      setCreateError('Please select both user and package');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const selectedPackage = packages.find(p => p.id === selectedPackageId);
      if (!selectedPackage) {
        throw new Error('Package not found');
      }

      // Calculate end date based on package duration
      const start = new Date(startDate);
      const end = new Date(start);
      // Subtract 1 because if you start on day 1, a 30-day plan should end on day 30 (not day 31)
      // Example: Jan 1 + 30 days - 1 = Jan 30 (which is correct for a 30-day plan)
      end.setDate(end.getDate() + selectedPackage.duration_days - 1);

      const result = await createMembership({
        user_id: selectedUserId,
        package_id: selectedPackageId,
        start_date: startDate,
        end_date: end.toISOString().split('T')[0],
        notes,
      });

      if (result.success) {
        setIsCreateModalOpen(false);
        setSelectedUserId('');
        setSelectedPackageId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        await loadData();
        alert('Membership created successfully!');
      } else {
        setCreateError(result.error || 'Failed to create membership');
      }
    } catch (error: any) {
      setCreateError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewMemberships = async (userId: string) => {
    setViewingUserId(userId);
    setIsLoadingMemberships(true);

    try {
      const result = await getUserMemberships(userId);
      if (result.success) {
        setUserMemberships(result.memberships);
      }
    } catch (error) {
      console.error('Failed to load memberships:', error);
    } finally {
      setIsLoadingMemberships(false);
    }
  };

  const handleCancelMembership = async (membershipId: string) => {
    if (!confirm('Are you sure you want to cancel this membership?')) {
      return;
    }

    try {
      const result = await cancelMembership(membershipId);
      if (result.success) {
        if (viewingUserId) {
          await handleViewMemberships(viewingUserId);
        }
        await loadData();
        alert('Membership cancelled successfully!');
      } else {
        alert('Failed to cancel membership: ' + result.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-1 text-xs font-medium text-success"><CheckCircle className="h-3 w-3" /> Active</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive"><XCircle className="h-3 w-3" /> Expired</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 rounded-full bg-muted/20 px-2 py-1 text-xs font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Cancelled</span>;
      default:
        return <span className="rounded-full bg-muted px-2 py-1 text-xs">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Membership Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign and manage user package memberships
        </p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Memberships</p>
                <p className="mt-1 text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="mt-1 text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="mt-1 text-2xl font-bold text-destructive">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.cancelled}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        </div>
      )}

      {/* Create Membership Button */}
      <div className="mb-6">
        <Button
          variant="primary"
          size="lg"
          onPress={() => setIsCreateModalOpen(true)}
        >
          Assign New Membership
        </Button>
      </div>

      {/* Create Membership Modal */}
      {isCreateModalOpen && (
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">Assign New Membership</h2>
          
          {createError && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <Select 
              selectedKey={selectedUserId} 
              onSelectionChange={(key) => setSelectedUserId(key as string)} 
              isDisabled={isCreating}
            >
              <Label>Select User</Label>
              <Button>
                <SelectValue>
                  {selectedUserId 
                    ? users.find(u => u.id === selectedUserId)?.display_name || users.find(u => u.id === selectedUserId)?.email || 'Choose a user...'
                    : 'Choose a user...'
                  }
                </SelectValue>
              </Button>
              <ListBox>
                <ListBoxItem id="">Choose a user...</ListBoxItem>
                {users.map((u) => (
                  <ListBoxItem key={u.id} id={u.id}>
                    {u.display_name || u.email}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select>

            <Select 
              selectedKey={selectedPackageId} 
              onSelectionChange={(key) => setSelectedPackageId(key as string)} 
              isDisabled={isCreating}
            >
              <Label>Select Package</Label>
              <Button>
                <SelectValue>
                  {selectedPackageId 
                    ? packages.find(p => p.id === selectedPackageId)?.name + ` - ${packages.find(p => p.id === selectedPackageId)?.duration_days} days - ₹${packages.find(p => p.id === selectedPackageId)?.price}` || 'Choose a package...'
                    : 'Choose a package...'
                  }
                </SelectValue>
              </Button>
              <ListBox>
                <ListBoxItem id="">Choose a package...</ListBoxItem>
                {packages.map((p) => (
                  <ListBoxItem key={p.id} id={p.id}>
                    {p.name} - {p.duration_days} days - ₹{p.price}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select>

            <TextField value={startDate} onChange={setStartDate} isDisabled={isCreating}>
              <Label>Start Date</Label>
              <Input type="date" />
            </TextField>

            <TextField value={notes} onChange={setNotes} isDisabled={isCreating}>
              <Label>Notes (Optional)</Label>
              <Input type="text" placeholder="Any additional notes..." />
            </TextField>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onPress={handleCreateMembership}
                isDisabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Membership'}
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setCreateError('');
                }}
                isDisabled={isCreating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users List */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{u.display_name || u.email}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleViewMemberships(u.id)}
              >
                View Memberships
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* View Memberships Modal */}
      {viewingUserId && (
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Memberships</h2>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setViewingUserId(null)}
            >
              Close
            </Button>
          </div>

          {isLoadingMemberships ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : userMemberships.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No memberships found for this user
            </p>
          ) : (
            <div className="space-y-3">
              {userMemberships.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{m.package_name}</h3>
                        {getStatusBadge(m.status)}
                      </div>
                      <div className="mt-2 grid gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(m.start_date).toLocaleDateString()} - {new Date(m.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {m.status === 'active' && !m.is_expired && (
                          <div className="text-primary">
                            Day {m.days_elapsed + 1} of {m.total_days} • {m.days_remaining} days remaining
                          </div>
                        )}
                        {m.notes && (
                          <div className="text-muted-foreground">
                            Note: {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    {m.status === 'active' && (
                      <Button
                        variant="danger-soft"
                        size="sm"
                        onPress={() => handleCancelMembership(m.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
>>>>>>> main
