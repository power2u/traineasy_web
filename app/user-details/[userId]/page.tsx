'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, Button, Spinner, Chip } from '@heroui/react';
import { ArrowLeft, Droplet, Utensils, Scale, Ruler, Bell, User, Calendar } from 'lucide-react';
import { ActivityCalendar } from '@/components/admin/activity-calendar';
import { DayDetails } from '@/components/admin/day-details';

interface UserDetails {
  user: any;
  weightLogs: any[];
  mealLogs: any[];
  waterLogs: any[];
  measurements: any[];
  membership: any;
}

export default function UserDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      const role = user.raw_app_meta_data?.role || user.raw_user_meta_data?.role;
      const isSuperAdmin = role === 'super_admin';
      
      if (!isSuperAdmin) {
        router.push('/dashboard');
      } else {
        loadUserDetails();
      }
    }
  }, [user, userId, router]);

  const loadUserDetails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'Failed to load user details');
      }
      
      setUserDetails(data);
    } catch (error: any) {
      console.error('Error loading user details:', error);
      setError(error.message || 'Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-2">{error}</p>
        <p className="text-default-500 mb-4 text-sm">User ID: {userId}</p>
        <div className="flex gap-2 justify-center">
          <Button onPress={() => router.push('/admin/users')}>Back to Users</Button>
          <Button variant="ghost" onPress={() => loadUserDetails()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500 mb-4">User not found</p>
        <Button onPress={() => router.push('/admin/users')}>Back to Users</Button>
      </div>
    );
  }

  const { user: userProfile, weightLogs, mealLogs, waterLogs, measurements, membership } = userDetails;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onPress={() => router.push('/admin/users')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>
        
        <Button
          onPress={() => router.push(`/user-profile-edit/${userId}`)}
          className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      {/* User Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{userProfile.full_name || 'Unnamed User'}</h1>
            <p className="text-default-500">{userProfile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Chip className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                User ID: {userProfile.id.slice(0, 8)}...
              </Chip>
              {userProfile.notifications_enabled && (
                <Chip className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                  <Bell className="w-3 h-3 mr-1" />
                  Notifications On
                </Chip>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-default-500">Member since</div>
            <div className="font-medium">
              {new Date(userProfile.created_at).toLocaleDateString()}
            </div>
            {userProfile.last_sign_in_at && (
              <>
                <div className="text-sm text-default-500 mt-2">Last active</div>
                <div className="font-medium">
                  {new Date(userProfile.last_sign_in_at).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-sm text-default-500">Weight Logs</div>
              <div className="text-xl font-bold">{weightLogs.length}</div>
              <div className="text-xs text-default-400">All time</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-sm text-default-500">Meal Logs</div>
              <div className="text-xl font-bold">{mealLogs.length}</div>
              <div className="text-xs text-default-400">All time</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-cyan-500" />
            <div>
              <div className="text-sm text-default-500">Water Logs</div>
              <div className="text-xl font-bold">{waterLogs.length}</div>
              <div className="text-xs text-default-400">All time</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Ruler className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-sm text-default-500">Measurements</div>
              <div className="text-xl font-bold">{measurements.length}</div>
              <div className="text-xs text-default-400">All time</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Card className="p-6">
        <div className="flex items-center gap-1 mb-6 border-b border-default-200 dark:border-default-700">
          {[
            { key: 'calendar', label: 'Activity Calendar', icon: Calendar },
            { key: 'overview', label: 'Summary', icon: User }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-default-500 hover:text-default-700 dark:hover:text-default-300 hover:bg-default-50 dark:hover:bg-default-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="xl:col-span-2">
                <ActivityCalendar
                  data={{
                    mealLogs,
                    weightLogs,
                    waterLogs,
                    measurements
                  }}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate || undefined}
                />
              </div>
              
              {/* Day Details */}
              <div className="xl:col-span-1">
                {selectedDate ? (
                  <DayDetails
                    date={selectedDate}
                    mealLogs={mealLogs}
                    weightLogs={weightLogs}
                    waterLogs={waterLogs}
                    measurements={measurements}
                    userProfile={userProfile}
                  />
                ) : (
                  <Card className="p-6">
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-default-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a Date</h3>
                      <p className="text-default-500">
                        Click on any date in the calendar to view detailed activity for that day
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* User Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-3">Personal Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-default-500">Height:</span>
                    <span>{userProfile.height_cm ? `${userProfile.height_cm} cm` : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Goal Weight:</span>
                    <span>{userProfile.goal_weight ? `${userProfile.goal_weight} ${userProfile.goal_weight_unit}` : 'Not set'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Blood Group:</span>
                    <span>{userProfile.blood_group || 'Not set'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-default-500">Preferred Unit:</span>
                    <span>{userProfile.preferred_unit || 'kg'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Theme:</span>
                    <span className="capitalize">{userProfile.theme || 'dark'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Timezone:</span>
                    <span>{userProfile.timezone || 'Asia/Kolkata'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Water Target:</span>
                    <span>{userProfile.daily_water_target ? `${userProfile.daily_water_target} glasses` : 'Not set'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-3">Notification Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-default-500">Notifications:</span>
                    <Chip className={userProfile.notifications_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                      {userProfile.notifications_enabled ? 'Enabled' : 'Disabled'}
                    </Chip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Meal Reminders:</span>
                    <Chip className={userProfile.meal_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                      {userProfile.meal_reminders_enabled ? 'Enabled' : 'Disabled'}
                    </Chip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Water Reminders:</span>
                    <Chip className={userProfile.water_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                      {userProfile.water_reminders_enabled ? 'Enabled' : 'Disabled'}
                    </Chip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-default-500">Weight Reminders:</span>
                    <Chip className={userProfile.weight_reminders_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}>
                      {userProfile.weight_reminders_enabled ? 'Enabled' : 'Disabled'}
                    </Chip>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Meal Timing Settings */}
            {userProfile.meal_times_configured && (
              <div>
                <h3 className="font-medium mb-3">Meal Timing Schedule</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {userProfile.breakfast_time && (
                    <div className="text-center p-3 bg-default-100 dark:bg-default-800 rounded-lg">
                      <div className="text-sm text-default-500">Breakfast</div>
                      <div className="font-medium">{userProfile.breakfast_time}</div>
                    </div>
                  )}
                  {userProfile.snack1_time && (
                    <div className="text-center p-3 bg-default-100 dark:bg-default-800 rounded-lg">
                      <div className="text-sm text-default-500">Morning Snack</div>
                      <div className="font-medium">{userProfile.snack1_time}</div>
                    </div>
                  )}
                  {userProfile.lunch_time && (
                    <div className="text-center p-3 bg-default-100 dark:bg-default-800 rounded-lg">
                      <div className="text-sm text-default-500">Lunch</div>
                      <div className="font-medium">{userProfile.lunch_time}</div>
                    </div>
                  )}
                  {userProfile.snack2_time && (
                    <div className="text-center p-3 bg-default-100 dark:bg-default-800 rounded-lg">
                      <div className="text-sm text-default-500">Afternoon Snack</div>
                      <div className="font-medium">{userProfile.snack2_time}</div>
                    </div>
                  )}
                  {userProfile.dinner_time && (
                    <div className="text-center p-3 bg-default-100 dark:bg-default-800 rounded-lg">
                      <div className="text-sm text-default-500">Dinner</div>
                      <div className="font-medium">{userProfile.dinner_time}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Membership Info */}
            {membership && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Membership Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">Package:</span>
                    <span className="font-medium">{membership.packages.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">Price:</span>
                    <span className="font-medium">₹{membership.packages.price}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">Duration:</span>
                    <span className="font-medium">{membership.packages.duration_days} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">Start Date:</span>
                    <span className="font-medium">{new Date(membership.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">End Date:</span>
                    <span className="font-medium">{new Date(membership.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">Status:</span>
                    <Chip className={membership.is_expired ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}>
                      {membership.is_expired ? 'Expired' : 'Active'}
                    </Chip>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}