import { useCallback } from 'react';

/**
 * Hook to manage user cron job registration
 */
export function useCronRegistration() {
  const registerUserCronJobs = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/cron/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Cron jobs registered successfully:', result.message);
        return { success: true, message: result.message };
      } else {
        console.error('Failed to register cron jobs:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error registering cron jobs:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const updateUserCronJobs = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/cron/register-user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Cron jobs updated successfully:', result.message);
        return { success: true, message: result.message };
      } else {
        console.error('Failed to update cron jobs:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating cron jobs:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const removeUserCronJobs = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/cron/register-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Cron jobs removed successfully:', result.message);
        return { success: true, message: result.message };
      } else {
        console.error('Failed to remove cron jobs:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error removing cron jobs:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const toggleUserCronJobs = useCallback(async (userId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/cron/user-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, enabled }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`Cron jobs ${enabled ? 'enabled' : 'disabled'} successfully:`, result.message);
        return { success: true, message: result.message };
      } else {
        console.error(`Failed to ${enabled ? 'enable' : 'disable'} cron jobs:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error ${enabled ? 'enabling' : 'disabling'} cron jobs:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const getUserCronJobs = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/cron/user-jobs?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        return { success: true, cronJobs: result.cronJobs };
      } else {
        console.error('Failed to get cron jobs:', result.error);
        return { success: false, error: result.error, cronJobs: [] };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting cron jobs:', errorMessage);
      return { success: false, error: errorMessage, cronJobs: [] };
    }
  }, []);

  return {
    registerUserCronJobs,
    updateUserCronJobs,
    removeUserCronJobs,
    toggleUserCronJobs,
    getUserCronJobs,
  };
}