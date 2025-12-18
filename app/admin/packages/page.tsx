<<<<<<< HEAD
'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Spinner, TextField, Label, Input } from '@heroui/react';
import { listPackages, createPackage, togglePackageStatus } from '@/app/actions/packages';

interface Package {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [price, setPrice] = useState('0');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const result = await listPackages();
      if (result.success) {
        setPackages(result.packages);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !durationDays || !price) {
      setError('All fields are required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPackage(
        name,
        parseFloat(price),
        parseInt(durationDays)
      );

      if (result.success) {
        setSuccess('Package created successfully!');
        setName('');
        setDurationDays('30');
        setPrice('0');
        
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setSuccess('');
          loadPackages();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create package');
      }
    } catch (err) {
      setError('Failed to create package');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (packageId: string, currentStatus: boolean) => {
    try {
      const result = await togglePackageStatus(packageId, !currentStatus);
      if (result.success) {
        loadPackages();
      } else {
        alert(result.error || 'Failed to update package status');
      }
    } catch (err) {
      alert('Failed to update package status');
    }
  };

  const stats = {
    total: packages.length,
    active: packages.filter(p => p.is_active).length,
    inactive: packages.filter(p => !p.is_active).length,
  };

  return (
    <>
      {/* Statistics Cards */}
      {!isLoading && packages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 md:gap-6 md:mb-8">
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Total Packages</div>
            <div className="text-xl font-bold md:text-3xl">{stats.total}</div>
          </Card>
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Active</div>
            <div className="text-xl font-bold text-green-500 md:text-3xl">{stats.active}</div>
          </Card>
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Inactive</div>
            <div className="text-xl font-bold text-gray-500 md:text-3xl">{stats.inactive}</div>
          </Card>
        </div>
      )}

      {/* Packages List */}
      <Card className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:mb-6">
          <div>
            <h2 className="text-base font-semibold md:text-xl">Packages ({packages.length})</h2>
            <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">Manage subscription packages</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onPress={loadPackages} isDisabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="primary" size="sm" onPress={() => setIsCreateModalOpen(true)}>
              + Create Package
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-default-400">No packages found</div>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-default-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Package Name</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Price</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Duration</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Status</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-default-200 hover:bg-default-100/50 dark:hover:bg-default-50/50 transition-colors">
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="font-medium text-sm md:text-base">{pkg.name}</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="font-bold text-sm md:text-base">₹{pkg.price}</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="text-xs text-default-500 md:text-sm">{pkg.duration_days} days</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded md:px-2 md:py-1 md:text-xs ${pkg.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onPress={() => handleToggleActive(pkg.id, pkg.is_active)}>
                          {pkg.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Package Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateModalOpen(false);
              setError('');
              setSuccess('');
            }
          }}
        >
          <Card className="w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-3 md:text-xl md:mb-4">Create New Package</h2>

            <form onSubmit={handleCreatePackage} className="space-y-3">
              <TextField value={name} onChange={setName} isRequired isDisabled={isCreating}>
                <Label>Package Name</Label>
                <Input placeholder="e.g., Pro Plan" />
              </TextField>

              <div className="grid grid-cols-2 gap-3">
                <TextField value={price} onChange={setPrice} isRequired isDisabled={isCreating}>
                  <Label>Price (₹)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="2999" />
                </TextField>

                <TextField value={durationDays} onChange={setDurationDays} isRequired isDisabled={isCreating}>
                  <Label>Duration (days)</Label>
                  <Input type="number" min="1" placeholder="30" />
                </TextField>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}
              {success && <div className="text-sm text-green-500">{success}</div>}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setIsCreateModalOpen(false);
                    setError('');
                    setSuccess('');
                  }}
                  isDisabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" isDisabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Package'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
=======
'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Spinner, TextField, Label, Input } from '@heroui/react';
import { listPackages, createPackage, togglePackageStatus } from '@/app/actions/packages';

interface Package {
  id: string;
  name: string;
  description: string;
  duration_days: number;
  price: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [price, setPrice] = useState('0');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const result = await listPackages();
      if (result.success) {
        setPackages(result.packages);
      }
    } catch (err) {
      console.error('Failed to load packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !durationDays || !price) {
      setError('All fields are required');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPackage(
        name,
        parseFloat(price),
        parseInt(durationDays)
      );

      if (result.success) {
        setSuccess('Package created successfully!');
        setName('');
        setDurationDays('30');
        setPrice('0');
        
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setSuccess('');
          loadPackages();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create package');
      }
    } catch (err) {
      setError('Failed to create package');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (packageId: string, currentStatus: boolean) => {
    try {
      const result = await togglePackageStatus(packageId, !currentStatus);
      if (result.success) {
        loadPackages();
      } else {
        alert(result.error || 'Failed to update package status');
      }
    } catch (err) {
      alert('Failed to update package status');
    }
  };

  const stats = {
    total: packages.length,
    active: packages.filter(p => p.is_active).length,
    inactive: packages.filter(p => !p.is_active).length,
  };

  return (
    <>
      {/* Statistics Cards */}
      {!isLoading && packages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 md:gap-6 md:mb-8">
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Total Packages</div>
            <div className="text-xl font-bold md:text-3xl">{stats.total}</div>
          </Card>
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Active</div>
            <div className="text-xl font-bold text-green-500 md:text-3xl">{stats.active}</div>
          </Card>
          <Card className="p-3 md:p-6">
            <div className="text-[10px] text-default-500 mb-1 md:text-sm md:mb-2">Inactive</div>
            <div className="text-xl font-bold text-gray-500 md:text-3xl">{stats.inactive}</div>
          </Card>
        </div>
      )}

      {/* Packages List */}
      <Card className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between md:mb-6">
          <div>
            <h2 className="text-base font-semibold md:text-xl">Packages ({packages.length})</h2>
            <p className="text-xs text-default-500 mt-0.5 md:text-sm md:mt-1">Manage subscription packages</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onPress={loadPackages} isDisabled={isLoading}>
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="primary" size="sm" onPress={() => setIsCreateModalOpen(true)}>
              + Create Package
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 text-default-400">No packages found</div>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-default-200">
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Package Name</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Price</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Duration</th>
                  <th className="text-left py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Status</th>
                  <th className="text-right py-2 px-2 text-xs font-semibold text-default-600 md:py-3 md:px-4 md:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-default-200 hover:bg-default-100/50 dark:hover:bg-default-50/50 transition-colors">
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="font-medium text-sm md:text-base">{pkg.name}</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="font-bold text-sm md:text-base">₹{pkg.price}</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="text-xs text-default-500 md:text-sm">{pkg.duration_days} days</div>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded md:px-2 md:py-1 md:text-xs ${pkg.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-2 md:py-4 md:px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onPress={() => handleToggleActive(pkg.id, pkg.is_active)}>
                          {pkg.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Package Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCreateModalOpen(false);
              setError('');
              setSuccess('');
            }
          }}
        >
          <Card className="w-full max-w-md p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-3 md:text-xl md:mb-4">Create New Package</h2>

            <form onSubmit={handleCreatePackage} className="space-y-3">
              <TextField value={name} onChange={setName} isRequired isDisabled={isCreating}>
                <Label>Package Name</Label>
                <Input placeholder="e.g., Pro Plan" />
              </TextField>

              <div className="grid grid-cols-2 gap-3">
                <TextField value={price} onChange={setPrice} isRequired isDisabled={isCreating}>
                  <Label>Price (₹)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="2999" />
                </TextField>

                <TextField value={durationDays} onChange={setDurationDays} isRequired isDisabled={isCreating}>
                  <Label>Duration (days)</Label>
                  <Input type="number" min="1" placeholder="30" />
                </TextField>
              </div>

              {error && <div className="text-sm text-red-500">{error}</div>}
              {success && <div className="text-sm text-green-500">{success}</div>}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setIsCreateModalOpen(false);
                    setError('');
                    setSuccess('');
                  }}
                  isDisabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="flex-1" isDisabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Package'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
>>>>>>> main
