'use client';

import { useState } from 'react';
import { createSuperAdmin, createUser, deleteUser, listAllUsers } from '@/app/actions/admin';
import { Button, Card, TextField, Label, Input, Text, Select, SelectValue, ListBox, ListBoxItem } from '@heroui/react';

export default function DevAdminPage() {
  const [email, setEmail] = useState('jaspreet.codrity@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  // Create user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'super_admin'>('user');

  const handleCreateAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await createSuperAdmin(email);
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await createUser(newUserEmail, newUserPassword, newUserName, newUserRole);
      setResult(response);
      if (response.success) {
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserRole('user');
        // Refresh user list
        handleListUsers();
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await deleteUser(userId);
      setResult(response);
      if (response.success) {
        // Refresh user list
        handleListUsers();
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleListUsers = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await listAllUsers();
      if (response.success) {
        setUsers(response.users || []);
        setResult({ success: true, message: `Found ${response.users?.length || 0} users` });
      } else {
        setResult(response);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">🔧 Development Admin Tools</h1>
          <Text className="mt-2 text-gray-400">
            This page is only available in development mode
          </Text>
        </div>

        {/* Create New User */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Create New User</h2>
          
          <div className="space-y-4">
            <TextField value={newUserName} onChange={setNewUserName} isDisabled={loading}>
              <Label>Full Name</Label>
              <Input placeholder="John Doe" />
            </TextField>

            <TextField value={newUserEmail} onChange={setNewUserEmail} isDisabled={loading}>
              <Label>Email</Label>
              <Input type="email" placeholder="user@example.com" />
            </TextField>

            <TextField value={newUserPassword} onChange={setNewUserPassword} isDisabled={loading}>
              <Label>Password</Label>
              <Input type="password" placeholder="Minimum 6 characters" />
            </TextField>

            <Select
              selectedKey={newUserRole}
              onSelectionChange={(key) => setNewUserRole(key as 'user' | 'super_admin')}
              isDisabled={loading}
            >
              <Label>Role</Label>
              <Button>
                <SelectValue />
              </Button>
              <ListBox>
                <ListBoxItem id="user">Regular User</ListBoxItem>
                <ListBoxItem id="super_admin">Super Admin</ListBoxItem>
              </ListBox>
            </Select>

            <Button
              variant="primary"
              onClick={handleCreateUser}
              isDisabled={loading || !newUserEmail || !newUserPassword || !newUserName}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </Card>

        {/* Make Existing User Super Admin */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Make Existing User Super Admin</h2>
          
          <div className="space-y-4">
            <TextField value={email} onChange={setEmail} isDisabled={loading}>
              <Label>User Email</Label>
              <Input type="email" placeholder="user@example.com" />
            </TextField>

            <Button
              variant="primary"
              onClick={handleCreateAdmin}
              isDisabled={loading || !email}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Make Super Admin'}
            </Button>
          </div>

          {result && (
            <div
              className={`mt-4 rounded-lg p-4 ${
                result.success
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              <div className="font-semibold">
                {result.success ? '✅ Success' : '❌ Error'}
              </div>
              <div className="mt-1 text-sm">
                {result.message || result.error}
              </div>
              {result.user && (
                <div className="mt-2 space-y-1 text-xs">
                  <div>ID: {result.user.id}</div>
                  <div>Email: {result.user.email}</div>
                  <div>Role: {result.user.role}</div>
                  <div>Name: {result.user.full_name}</div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* List Users */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">All Users</h2>
          
          <Button
            variant="secondary"
            onClick={handleListUsers}
            isDisabled={loading}
            className="w-full"
          >
            {loading ? 'Loading...' : 'List All Users'}
          </Button>

          {users.length > 0 && (
            <div className="mt-4 space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="rounded-lg border border-gray-800 bg-gray-900 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{user.full_name || user.email}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          user.role === 'super_admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {user.role || 'user'}
                      </div>
                      <Button
                        variant="danger-soft"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        isDisabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Provider: {user.provider}</span>
                    <span>ID: {user.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">📝 Instructions</h2>
          <div className="space-y-3 text-sm text-gray-400">
            <div>
              <p className="font-semibold text-white">Setup:</p>
              <p>1. Add SUPABASE_SERVICE_ROLE_KEY to your .env.local</p>
              <p>2. Restart the dev server</p>
            </div>
            
            <div>
              <p className="font-semibold text-white">Create New User:</p>
              <p>1. Fill in name, email, password, and role</p>
              <p>2. Click "Create User" - email is auto-confirmed</p>
              <p>3. User can immediately sign in</p>
            </div>
            
            <div>
              <p className="font-semibold text-white">Promote Existing User:</p>
              <p>1. Enter user's email</p>
              <p>2. Click "Make Super Admin"</p>
              <p>3. User needs to sign out and sign in again</p>
            </div>

            <div className="mt-4 rounded-lg bg-yellow-500/10 p-3 text-yellow-400">
              ⚠️ This page only works in development mode
            </div>
            
            <div className="rounded-lg bg-red-500/10 p-3 text-red-400">
              🔒 Public signup is now disabled - only admins can create users
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
