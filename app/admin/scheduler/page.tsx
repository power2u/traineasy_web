'use client';

import { useState, useEffect } from 'react';

interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: string[];
  jobCount: number;
}

interface SchedulerData {
  success: boolean;
  scheduler?: SchedulerStatus;  // For GET requests
  status?: SchedulerStatus;     // For POST requests
  message?: string;
  timestamp: string;
}

export default function SchedulerAdminPage() {
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get scheduler status from either scheduler or status property
  const getSchedulerStatus = (data: SchedulerData | null): SchedulerStatus | null => {
    if (!data) return null;
    return data.scheduler || data.status || null;
  };

  const fetchSchedulerStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/scheduler', {
        headers: {
          'x-requested-with': 'XMLHttpRequest',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Scheduler API response:', data); // Debug log
      setSchedulerData(data);
      setError(null);
    } catch (err) {
      console.error('Fetch scheduler error:', err); // Debug log
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduler status');
    } finally {
      setLoading(false);
    }
  };

  const testWelcomeNotification = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/welcome-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Welcome notification test result:', data);
      setError(null);
      // You could show a success message here
    } catch (err) {
      console.error('Test welcome notification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to test welcome notification');
    } finally {
      setActionLoading(false);
    }
  };

  const manualCleanup = async () => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/manual-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Manual cleanup result:', data);
      setError(null);
      // Refresh scheduler status after cleanup
      fetchSchedulerStatus();
    } catch (err) {
      console.error('Manual cleanup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to run manual cleanup');
    } finally {
      setActionLoading(false);
    }
  };

  const controlScheduler = async (action: 'start' | 'stop') => {
    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSchedulerData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} scheduler`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSchedulerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !schedulerData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading scheduler status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Internal Scheduler Management</h1>
        <button
          onClick={fetchSchedulerStatus}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-red-500 text-sm">❌ {error}</p>
        </div>
      )}

      {schedulerData?.message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">
            ✅ {schedulerData.message}
          </p>
        </div>
      )}

      {schedulerData && !getSchedulerStatus(schedulerData) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            ⚠️ Scheduler data received but format is unexpected. Check console for details.
          </p>
          <pre className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 overflow-auto">
            {JSON.stringify(schedulerData, null, 2)}
          </pre>
        </div>
      )}

      {schedulerData && getSchedulerStatus(schedulerData) && (
        <>
          {/* Scheduler Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Scheduler Status</h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                getSchedulerStatus(schedulerData)?.isRunning 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {getSchedulerStatus(schedulerData)?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getSchedulerStatus(schedulerData)?.isRunning ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {getSchedulerStatus(schedulerData)?.jobCount || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Jobs</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Date(schedulerData.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
                </div>
              </div>

              {/* Active Jobs */}
              {getSchedulerStatus(schedulerData)?.activeJobs && getSchedulerStatus(schedulerData)!.activeJobs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Active Jobs:</h3>
                  <div className="flex flex-wrap gap-2">
                    {getSchedulerStatus(schedulerData)!.activeJobs.map((job) => (
                      <span key={job} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded text-sm">
                        {job}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex flex-wrap gap-2 pt-4">
                <button
                  onClick={() => controlScheduler('start')}
                  disabled={actionLoading || getSchedulerStatus(schedulerData)?.isRunning}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Loading...' : 'Start Scheduler'}
                </button>
                
                <button
                  onClick={() => controlScheduler('stop')}
                  disabled={actionLoading || !getSchedulerStatus(schedulerData)?.isRunning}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Loading...' : 'Stop Scheduler'}
                </button>

                <button
                  onClick={testWelcomeNotification}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Loading...' : 'Test Welcome Notification'}
                </button>

                <button
                  onClick={manualCleanup}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Loading...' : 'Clean Old Tokens'}
                </button>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">How It Works</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                <strong>🔄 Internal Scheduler:</strong> Runs within the Next.js app process, 
                eliminating the need for system-level cron setup.
              </p>
              <p>
                <strong>📅 Meal Notifications:</strong> Checks every hour for users who need 
                meal reminders based on their timezone and meal preferences.
              </p>
              <p>
                <strong>🧹 Token Cleanup:</strong> Runs daily to remove invalid or expired 
                FCM tokens from the database.
              </p>
              <p>
                <strong>🚀 Auto-Start:</strong> Automatically starts in production mode when 
                the app deploys. Can be manually controlled in development.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}