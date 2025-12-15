'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, Button, Spinner, Chip } from '@heroui/react';
import { ArrowLeft, Droplet, Utensils, Scale, Ruler, Bell, User } from 'lucide-react';

interface UserDetails {
  user: any;
  weightLogs: any[];
  mealLogs: any[];
  waterLogs: any[];
  measurements: any[];
  membership: any;
  fcmTokens: any[];
}

export default function UserDetailsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
          <Button onPress={() => router.back()}>Go Back</Button>
          <Button variant="ghost" onPress={() => loadUserDetails()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500 mb-4">User not found</p>
        <Button onPress={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const { user: userProfile, weightLogs, mealLogs, waterLogs, measurements, membership, fcmTokens } = userDetails;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onPress={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>
        
        <Button
          onPress={() => router.push(`/admin/users/${userId}/profile`)}
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
              <Chip className="bg-blue-100 text-blue-800">
                User ID: {userProfile.id.slice(0, 8)}...
              </Chip>
              {userProfile.notifications_enabled && (
                <Chip className="bg-green-100 text-green-800">
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
              <div className="text-xs text-default-400">Last 30 days</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Utensils className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-sm text-default-500">Meal Logs</div>
              <div className="text-xl font-bold">{mealLogs.length}</div>
              <div className="text-xs text-default-400">Last 7 days</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Droplet className="w-8 h-8 text-cyan-500" />
            <div>
              <div className="text-sm text-default-500">Water Logs</div>
              <div className="text-xl font-bold">{waterLogs.length}</div>
              <div className="text-xs text-default-400">Last 7 days</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Ruler className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-sm text-default-500">Measurements</div>
              <div className="text-xl font-bold">{measurements.length}</div>
              <div className="text-xs text-default-400">Last 30 days</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Membership Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Membership Status</h2>
        {membership ? (
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
              <Chip className={membership.is_expired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                {membership.is_expired ? 'Expired' : 'Active'}
              </Chip>
            </div>
          </div>
        ) : (
          <p className="text-default-500">No active membership</p>
        )}
      </Card>
      {/* User Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">User Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Personal Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">Age:</span>
                <span>{userProfile.age || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Gender:</span>
                <span>{userProfile.gender || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Height:</span>
                <span>{userProfile.height ? `${userProfile.height} cm` : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Activity Level:</span>
                <span>{userProfile.activity_level || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Goal:</span>
                <span>{userProfile.goal || 'Not set'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Targets & Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-default-500">Goal Weight:</span>
                <span>{userProfile.goal_weight ? `${userProfile.goal_weight} kg` : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Water Target:</span>
                <span>{userProfile.water_target ? `${userProfile.water_target} ml` : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Timezone:</span>
                <span>{userProfile.timezone || 'Asia/Kolkata'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Meal Reminders:</span>
                <Chip className={userProfile.meal_reminders_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {userProfile.meal_reminders_enabled ? 'Enabled' : 'Disabled'}
                </Chip>
              </div>
            </div>
          </div>
        </div>
        
        {/* Meal Timing Settings */}
        {userProfile.meal_times_configured && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">Meal Timing Schedule</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {userProfile.breakfast_time && (
                <div className="text-center p-3 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500">Breakfast</div>
                  <div className="font-medium">{userProfile.breakfast_time}</div>
                </div>
              )}
              {userProfile.snack1_time && (
                <div className="text-center p-3 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500">Morning Snack</div>
                  <div className="font-medium">{userProfile.snack1_time}</div>
                </div>
              )}
              {userProfile.lunch_time && (
                <div className="text-center p-3 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500">Lunch</div>
                  <div className="font-medium">{userProfile.lunch_time}</div>
                </div>
              )}
              {userProfile.snack2_time && (
                <div className="text-center p-3 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500">Afternoon Snack</div>
                  <div className="font-medium">{userProfile.snack2_time}</div>
                </div>
              )}
              {userProfile.dinner_time && (
                <div className="text-center p-3 bg-default-100 rounded-lg">
                  <div className="text-sm text-default-500">Dinner</div>
                  <div className="font-medium">{userProfile.dinner_time}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Weight Logs */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Weight Logs</h2>
          {weightLogs.length > 0 ? (
            <div className="space-y-3">
              {weightLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-default-200 last:border-b-0">
                  <div>
                    <div className="font-medium">{log.weight} kg</div>
                    <div className="text-sm text-default-500">{new Date(log.date).toLocaleDateString()}</div>
                  </div>
                  {log.notes && (
                    <div className="text-sm text-default-400 max-w-32 truncate">{log.notes}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-default-500">No weight logs in the last 30 days</p>
          )}
        </Card>

        {/* Recent Meal Activity */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Meal Activity</h2>
          {mealLogs.length > 0 ? (
            <div className="space-y-3">
              {mealLogs.slice(0, 5).map((meal, index) => {
                const completedMeals = [
                  meal.breakfast_completed && 'Breakfast',
                  meal.snack1_completed && 'Morning Snack',
                  meal.lunch_completed && 'Lunch',
                  meal.snack2_completed && 'Afternoon Snack',
                  meal.dinner_completed && 'Dinner'
                ].filter(Boolean);
                
                return (
                  <div key={index} className="py-2 border-b border-default-200 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{new Date(meal.date).toLocaleDateString()}</div>
                      <div className="text-sm text-default-500">{completedMeals.length}/5 meals</div>
                    </div>
                    {completedMeals.length > 0 && (
                      <div className="text-sm text-default-400 mt-1">
                        {completedMeals.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-default-500">No meal logs in the last 7 days</p>
          )}
        </Card>
      </div>

      {/* Body Measurements */}
      {measurements.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Body Measurements</h2>
          <div className="space-y-3">
            {measurements.slice(0, 5).map((measurement, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-default-200 last:border-b-0">
                <div>
                  <div className="font-medium capitalize">{measurement.measurement_type.replace('_', ' ')}</div>
                  <div className="text-sm text-default-500">{new Date(measurement.date).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{measurement.value} {measurement.unit}</div>
                  {measurement.notes && (
                    <div className="text-sm text-default-400">{measurement.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Water Intake Summary */}
      {waterLogs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Water Intake Summary (Last 7 Days)</h2>
          <div className="space-y-3">
            {waterLogs.slice(0, 7).map((log, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-default-200 last:border-b-0">
                <div className="font-medium">{new Date(log.date).toLocaleDateString()}</div>
                <div className="text-right">
                  <div className="font-medium">{log.amount} ml</div>
                  <div className="text-sm text-default-500">
                    {userProfile.water_target ? 
                      `${Math.round((log.amount / userProfile.water_target) * 100)}% of target` : 
                      'No target set'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* FCM Tokens */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Push Notification Tokens</h2>
        {fcmTokens.length > 0 ? (
          <div className="space-y-3">
            {fcmTokens.map((token, index) => (
              <div key={index} className="p-3 bg-default-100 rounded-lg">
                <div className="font-mono text-sm break-all mb-2">{token.token}</div>
                <div className="flex items-center gap-4 text-xs text-default-500">
                  <span>Created: {new Date(token.created_at).toLocaleDateString()}</span>
                  {token.last_used_at && (
                    <span>Last used: {new Date(token.last_used_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-default-500">No FCM tokens registered</p>
        )}
      </Card>
    </div>
  );
}